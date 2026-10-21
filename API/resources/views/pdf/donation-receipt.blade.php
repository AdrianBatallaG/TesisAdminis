<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Comprobante parroquial</title>
    <style>
        @page { margin: 13mm 14mm 15mm; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; font-size: 8pt; line-height: 1.4; color: #28362f; }
        .frame { position: fixed; top: -6mm; left: -7mm; right: -7mm; bottom: -8mm; border: 0.7pt solid #ab925d; z-index: -1; }
        .frame-inner { position: fixed; top: -4.8mm; left: -5.8mm; right: -5.8mm; bottom: -6.8mm; border: 0.35pt solid #e1d9c8; z-index: -1; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; overflow-wrap: break-word; }
        .header { text-align: center; border-bottom: 1.5pt solid #405749; padding-bottom: 2mm; }
        .logo { width: 32mm; height: 32mm; display: block; margin: 0 auto; }
        .heading { text-align: center; margin: 3mm 0 2mm; }
        h1 { font-family: DejaVu Serif, serif; font-size: 23pt; font-weight: normal; line-height: 1.1; margin: 0 0 2mm; }
        .subtitle { text-transform: uppercase; letter-spacing: 2pt; font-size: 8pt; color: #7b6844; }
        .reference { margin-top: 2mm; color: #637269; font-size: 7pt; }
        .amount-panel { background: #f3f5f1; border-top: 1pt solid #ab925d; border-bottom: 1pt solid #ab925d; text-align: center; padding: 2mm; page-break-inside: avoid; }
        .amount-label { font-size: 7pt; color: #637269; letter-spacing: 1pt; text-transform: uppercase; }
        .amount { font-family: DejaVu Serif, serif; font-size: 24pt; color: #405749; line-height: 1.3; }
        .currency { font-size: 7pt; color: #637269; }
        .section { margin: 3mm 0 1.5mm; padding-bottom: 1mm; border-bottom: 0.5pt solid #d7dcd5; font-size: 7pt; color: #7b6844; letter-spacing: 1pt; text-transform: uppercase; }
        .facts { table-layout: fixed; }
        .facts td { word-wrap: break-word; padding: 0.6mm 0; }
        .facts .label { width: 26%; color: #637269; font-size: 8pt; padding-right: 2mm; }
        .facts tr { page-break-inside: avoid; }
        .closing { margin-top: 2mm; padding-top: 2mm; border-top: 0.6pt solid #ab925d; page-break-inside: avoid; }
        .thanks { font-family: DejaVu Serif, serif; font-size: 11pt; color: #405749; margin-bottom: 2mm; }
        .note { font-size: 7pt; line-height: 1.5; color: #637269; }
        .issued { margin-top: 2mm; font-size: 6.5pt; color: #637269; }
        .sample { color: #8a4832; font-size: 6.5pt; margin-top: 2mm; }
        .footer { position: fixed; bottom: -5mm; left: 0; right: 0; text-align: center; font-size: 5.5pt; letter-spacing: 0.7pt; color: #7a8178; }
    </style>
</head>
<body>
    @php
        $logoDataUri = 'data:image/png;base64,'.base64_encode(file_get_contents(resource_path('images/parish-logo-transparent.png')));
        $categories = ['donacion_general' => 'Donación general', 'ofrenda' => 'Ofrenda', 'ayuda_social' => 'Ayuda social', 'mantenimiento' => 'Mantenimiento parroquial'];
        $category = $categories[$donation->categoria] ?? ucfirst(str_replace('_', ' ', $donation->categoria ?? 'No registrada'));
        $isExpense = $donation->tipo_movimiento === 'egreso';
    @endphp
    <div class="frame"></div>
    <div class="frame-inner"></div>
    <div class="footer">SAN FRANCISCO DE ASÍS · CALDERÓN · ADMINISTRACIÓN PARROQUIAL</div>
    <div class="header">
        <img class="logo" src="{{ $logoDataUri }}" alt="Logo de la parroquia" />
    </div>
    <div class="heading">
        <h1>Comprobante</h1>
        <div class="subtitle">{{ $isExpense ? 'Registro de egreso' : 'Donaciones y ofrendas' }}</div>
        <div class="reference">Registro N.º {{ str_pad((string) $donation->id, 6, '0', STR_PAD_LEFT) }}</div>
    </div>
    <div class="amount-panel">
        <div class="amount-label">Monto registrado</div>
        <div class="amount">${{ number_format((float) $donation->monto, 2) }}</div>
        <div class="currency">Dólares estadounidenses · USD</div>
    </div>
    <div class="section">Datos del registro</div>
    <table class="facts"><colgroup><col style="width: 26%;" /><col style="width: 74%;" /></colgroup>
        <tr><td class="label">{{ $isExpense ? 'A nombre de' : 'Donante' }}</td><td><strong>{{ $donation->nombre_donante }}</strong></td></tr>
        <tr><td class="label">Correo</td><td>{{ $donation->email_donante ?: 'No registrado' }}</td></tr>
        <tr><td class="label">Fecha</td><td>{{ optional($donation->fecha)->format('d/m/Y') ?: 'No registrada' }}</td></tr>
        <tr><td class="label">Categoría</td><td>{{ $category }}</td></tr>
        <tr><td class="label">Movimiento</td><td>{{ $isExpense ? 'Egreso' : 'Ingreso' }}</td></tr>
        <tr><td class="label">Referencia externa</td><td>{{ $donation->numero_comprobante ?: 'No registrada' }}</td></tr>
    </table>
    <div class="closing">
        @unless($isExpense)<div class="thanks">Gracias por apoyar a nuestra comunidad.</div>@endunless
        <div class="note">Esta constancia acredita el registro en el sistema parroquial. La confirmación del aporte corresponde a la administración de la parroquia.</div>
        <div class="issued">Emitido el {{ $issuedAt->format('d/m/Y') }} a las {{ $issuedAt->format('H:i') }} · ADMINIS</div>
        @if($isSample ?? false)<div class="sample">MUESTRA DE DISEÑO · DATOS FICTICIOS · SIN VALIDEZ</div>@endif
    </div>
</body>
</html>
