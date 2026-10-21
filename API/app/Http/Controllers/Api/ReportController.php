<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Donation;
use App\Models\EventAttendance;
use App\Models\Sacrament;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $year = (int) ($request->integer('year') ?: now()->year);

        $sacramentsByType = Sacrament::query()
            ->whereYear('fecha', $year)
            ->selectRaw('tipo, COUNT(*) as total')
            ->groupBy('tipo')
            ->orderBy('tipo')
            ->get();

        $monthlyAttendance = collect(range(1, 12))->map(function (int $month) use ($year): array {
            $total = EventAttendance::query()
                ->whereYear('registrado_en', $year)
                ->whereMonth('registrado_en', $month)
                ->count();

            return [
                'month' => $month,
                'total' => $total,
            ];
        });

        $financialByCategory = Donation::query()->where('review_status', 'aprobado')
            ->whereYear('fecha', $year)
            ->selectRaw('categoria, SUM(monto) as total')
            ->groupBy('categoria')
            ->orderBy('categoria')
            ->get()
            ->map(fn ($row) => [
                'categoria' => $row->categoria,
                'total' => (float) $row->total,
            ]);

        return response()->json([
            'year' => $year,
            'sacraments_by_type' => $sacramentsByType,
            'attendance_by_month' => $monthlyAttendance,
            'financial_by_category' => $financialByCategory,
        ]);
    }

    public function exportSacramentsCsv(Request $request): StreamedResponse
    {
        $rows = $this->sacramentsRows($request);

        return $this->downloadCsv(
            'reporte-sacramentos.csv',
            ['Tipo', 'Nombre', 'Fecha', 'Número certificado', 'Celebrante', 'Estado'],
            $rows
        );
    }

    public function exportFinancialCsv(Request $request): StreamedResponse
    {
        $rows = $this->financialRows($request);

        return $this->downloadCsv(
            'reporte-finanzas.csv',
            ['Donante', 'Tipo', 'Categoría', 'Monto', 'Fecha', 'Número comprobante'],
            $rows
        );
    }

    public function exportSacramentsXlsx(Request $request): StreamedResponse
    {
        return $this->downloadXlsx(
            'reporte-sacramentos.xlsx',
            ['Tipo', 'Nombre', 'Fecha', 'Número certificado', 'Celebrante', 'Estado'],
            $this->sacramentsRows($request)
        );
    }

    public function exportFinancialXlsx(Request $request): StreamedResponse
    {
        return $this->downloadXlsx(
            'reporte-finanzas.xlsx',
            ['Donante', 'Tipo', 'Categoría', 'Monto', 'Fecha', 'Número comprobante'],
            $this->financialRows($request)
        );
    }

    public function exportSacramentsPdf(Request $request)
    {
        $headers = ['Tipo', 'Nombre', 'Fecha', 'No. certificado', 'Celebrante', 'Estado'];
        $rows = $this->sacramentsRows($request);

        $pdf = Pdf::loadView('pdf.report-table', [
            'title' => 'Reporte de sacramentos',
            'headers' => $headers,
            'rows' => $rows,
            'generatedAt' => now(),
        ])->setPaper('A4', 'landscape');

        return $pdf->download('reporte-sacramentos.pdf');
    }

    public function exportFinancialPdf(Request $request)
    {
        $headers = ['Donante', 'Tipo', 'Categoría', 'Monto', 'Fecha', 'No. comprobante'];
        $rows = $this->financialRows($request);

        $pdf = Pdf::loadView('pdf.report-table', [
            'title' => 'Reporte financiero',
            'headers' => $headers,
            'rows' => $rows,
            'generatedAt' => now(),
        ])->setPaper('A4', 'landscape');

        return $pdf->download('reporte-finanzas.pdf');
    }

    /**
     * @return list<array<int, mixed>>
     */
    private function sacramentsRows(Request $request): array
    {
        $request->validate(['year' => ['nullable', 'integer', 'between:2000,2100']]);
        return Sacrament::query()
            ->when($request->filled('year'), fn ($query) => $query->whereYear('fecha', $request->integer('year')))
            ->latest('fecha')
            ->get(['tipo', 'nombre', 'fecha', 'numero_certificado', 'celebrante', 'estado'])
            ->map(fn (Sacrament $row) => [
                $row->tipo,
                $row->nombre,
                optional($row->fecha)->toDateString(),
                $row->numero_certificado,
                $row->celebrante,
                $row->estado,
            ])
            ->all();
    }

    /**
     * @return list<array<int, mixed>>
     */
    private function financialRows(Request $request): array
    {
        $request->validate(['year' => ['nullable', 'integer', 'between:2000,2100']]);
        return Donation::query()->where('review_status', 'aprobado')
            ->when($request->filled('year'), fn ($query) => $query->whereYear('fecha', $request->integer('year')))
            ->latest('fecha')
            ->get(['nombre_donante', 'tipo_movimiento', 'categoria', 'monto', 'fecha', 'numero_comprobante'])
            ->map(fn (Donation $row) => [
                $row->nombre_donante,
                $row->tipo_movimiento,
                $row->categoria,
                (float) $row->monto,
                optional($row->fecha)->toDateString(),
                $row->numero_comprobante,
            ])
            ->all();
    }

    /**
     * @param  list<string>  $headers
     * @param  list<array<int, mixed>>  $rows
     */
    private function downloadCsv(string $fileName, array $headers, array $rows): StreamedResponse
    {
        return response()->streamDownload(
            static function () use ($headers, $rows): void {
                $output = fopen('php://output', 'w');

                if ($output === false) {
                    return;
                }

                fputcsv($output, $headers);

                foreach ($rows as $row) {
                    fputcsv($output, $row);
                }

                fclose($output);
            },
            $fileName,
            ['Content-Type' => 'text/csv']
        );
    }

    /**
     * @param  list<string>  $headers
     * @param  list<array<int, mixed>>  $rows
     */
    private function downloadXlsx(string $fileName, array $headers, array $rows): StreamedResponse
    {
        return response()->streamDownload(
            static function () use ($headers, $rows): void {
                $spreadsheet = new Spreadsheet();
                $sheet = $spreadsheet->getActiveSheet();

                $column = 1;
                foreach ($headers as $header) {
                    $coordinate = Coordinate::stringFromColumnIndex($column).'1';
                    $sheet->setCellValue($coordinate, $header);
                    $column++;
                }

                $rowNumber = 2;
                foreach ($rows as $row) {
                    $column = 1;
                    foreach ($row as $value) {
                        $coordinate = Coordinate::stringFromColumnIndex($column).$rowNumber;
                        $sheet->setCellValue($coordinate, (string) $value);
                        $column++;
                    }
                    $rowNumber++;
                }

                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            },
            $fileName,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]
        );
    }
}
