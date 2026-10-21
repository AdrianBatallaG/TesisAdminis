<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Certificado sacramental | San Francisco de Asís</title>
    <style>
        @page { margin: 11mm 12mm 13mm; }
        body { margin: 0; font-family: DejaVu Sans, sans-serif; font-size: 7.5pt; line-height: 1.3; color: #28362f; }
        .frame { position: fixed; top: -5mm; left: -6mm; right: -6mm; bottom: -7mm; border: 0.7pt solid #ab925d; z-index: -1; }
        .frame-inner { position: fixed; top: -3.8mm; left: -4.8mm; right: -4.8mm; bottom: -5.8mm; border: 0.35pt solid #e1d9c8; z-index: -1; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        .header { text-align: center; border-bottom: 1.5pt solid #405749; padding-bottom: 2mm; }
        .logo { width: 32mm; height: 32mm; display: block; margin: 0 auto; }
        .document-heading { text-align: center; padding: 2mm 0 1mm; }
        .document-heading h1 { font-family: DejaVu Serif, serif; font-size: 20pt; font-weight: normal; line-height: 1; margin: 0 0 1mm; }
        .sacrament-type { text-transform: uppercase; font-size: 8pt; letter-spacing: 2pt; color: #7b6844; }
        .reference { font-size: 6.5pt; line-height: 1.2; color: #637269; margin-top: 1mm; overflow-wrap: break-word; }
        .sample { color: #8a4832; font-size: 6.5pt; letter-spacing: 1pt; margin-top: 1mm; }
        .intro { font-size: 7.5pt; line-height: 1.3; text-align: center; margin: 0 0 1mm; color: #556359; }
        .recipient { font-family: DejaVu Serif, serif; text-align: center; font-size: 14pt; line-height: 1.2; font-weight: bold; margin: 0 0 1mm; overflow-wrap: break-word; }
        .section-label { font-size: 6.5pt; letter-spacing: 1.2pt; text-transform: uppercase; color: #7b6844; margin: 2mm 0 0.6mm; border-bottom: 0.5pt solid #d7dcd5; padding-bottom: 0.6mm; }
        .facts td { padding: 0.25mm 0; overflow-wrap: break-word; line-height: 1.2; }
        .facts .label { width: 27mm; color: #68746d; font-size: 7pt; padding-right: 2mm; }
        .type-matrimonio .facts td { font-size: 7.5pt; line-height: 1.15; padding-top: 0.15mm; padding-bottom: 0.15mm; }
        .type-matrimonio .facts .label { font-size: 7pt; }
        .register { background: #f3f5f1; border-left: 2pt solid #ab925d; padding: 1mm 3mm; margin-top: 2mm; font-size: 7pt; line-height: 1.35; overflow-wrap: break-word; page-break-inside: avoid; }
        .register-title { font-size: 6pt; text-transform: uppercase; letter-spacing: 1pt; color: #637269; margin-bottom: 0.7mm; }
        .notes { font-size: 7pt; color: #556359; white-space: pre-line; overflow-wrap: break-word; }
        .closing { margin-top: 1.5mm; font-size: 7pt; color: #556359; }
        .authentication { page-break-inside: avoid; }
        .signatures { margin-top: 2mm; }
        .signature-cell { width: 50%; vertical-align: bottom; text-align: center; padding-right: 4mm; }
        .signature-line { border-top: 0.6pt solid #53675a; margin-top: 8mm; padding-top: 1.5mm; font-size: 8pt; }
        .signature-role { color: #637269; font-size: 6.5pt; }
        .seal-cell { text-align: center; vertical-align: bottom; width: 25%; }
        .seal { border: 0.6pt dashed #b6bcae; border-radius: 50%; width: 18mm; height: 18mm; margin: 0 auto 1mm; }
        .seal-caption { color: #637269; font-size: 6pt; }
        .verification { border-top: 0.6pt solid #ab925d; margin-top: 2mm; padding-top: 1.5mm; font-size: 6pt; line-height: 1.4; color: #637269; }
        .qr-cell { width: 25%; vertical-align: bottom; text-align: center; }
        .qr { width: 20mm; height: 20mm; }
        .verification-copy { vertical-align: middle; padding-left: 2mm; font-size: 6.5pt; line-height: 1.45; color: #637269; }
        .verification-title { font-weight: bold; color: #405749; font-size: 7pt; margin-bottom: 1mm; }
        .issued { margin-top: 1mm; font-size: 6pt; }
        .page-footer { position: fixed; bottom: -4mm; left: 0; right: 0; text-align: center; font-size: 5.5pt; letter-spacing: 0.6pt; color: #7a8178; }
    </style>
</head>
<body class="type-{{ $sacrament->tipo }}">
    @php
        $details = $sacrament->datos_adicionales ?? [];
        $padres = $details['padres'] ?? [];
        $padrinos = $details['padrinos'] ?? $sacrament->padrinos ?? [];
        $testigos = $details['testigos'] ?? [];
        $typeNames = ['bautismo' => 'Bautismo', 'comunion' => 'Primera comunión', 'confirmacion' => 'Confirmación', 'matrimonio' => 'Matrimonio'];
        $typeName = $typeNames[$sacrament->tipo] ?? ucfirst($sacrament->tipo);
        $isSample = $isSample ?? false;
        $logoPath = resource_path('images/parish-logo-transparent.png');
        $logoDataUri = 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath));
    @endphp
    <div class="frame"></div>
    <div class="frame-inner"></div>
    <div class="page-footer">SAN FRANCISCO DE ASÍS · CALDERÓN · ARCHIVO PARROQUIAL</div>
    <div class="header">
        <img class="logo" src="{{ $logoDataUri }}" alt="Logo de la parroquia" />
    </div>
    <div class="document-heading">
        <h1>Certificado</h1>
        <div class="sacrament-type">{{ $typeName }}</div>
        <div class="reference">N.º {{ $sacrament->numero_certificado }}</div>
    </div>
    <p class="intro">Conforme al archivo sacramental de esta parroquia,<br />se certifica el registro de {{ mb_strtolower($typeName) }} de:</p>
    <div class="recipient">{{ $sacrament->nombre }} {{ $sacrament->apellido }}</div>
    <table class="facts">
        <tr><td class="label">Fecha</td><td>{{ $sacrament->fecha?->locale('es')->translatedFormat('j \d\e F \d\e Y') ?: 'No registrada' }}</td></tr>
        <tr><td class="label">Lugar</td><td>{{ $sacrament->lugar ?: 'No registrado' }}</td></tr>
        <tr><td class="label">Celebrante</td><td>{{ $sacrament->celebrante ?: 'No registrado' }}</td></tr>
    </table>
    @if($sacrament->tipo === 'bautismo')
        <div class="section-label">Filiación y padrinos</div>
        <table class="facts">
            <tr><td class="label">Padre</td><td>{{ $padres['padre'] ?? 'No registrado' }}</td></tr>
            <tr><td class="label">Madre</td><td>{{ $padres['madre'] ?? 'No registrada' }}</td></tr>
            <tr><td class="label">Padrinos</td><td>{{ is_array($padrinos) && count($padrinos) ? implode(', ', $padrinos) : 'No registrados' }}</td></tr>
        </table>
    @elseif($sacrament->tipo === 'confirmacion')
        <div class="section-label">Datos de confirmación</div>
        <table class="facts">
            <tr><td class="label">Obispo o delegado</td><td>{{ $details['obispo_o_delegado'] ?? 'No registrado' }}</td></tr>
            <tr><td class="label">Padrinos</td><td>{{ is_array($padrinos) && count($padrinos) ? implode(', ', $padrinos) : 'No registrados' }}</td></tr>
        </table>
    @elseif($sacrament->tipo === 'matrimonio')
        <div class="section-label">Datos de matrimonio</div>
        <table class="facts">
            <tr><td class="label">Cónyuge 1</td><td>{{ $details['conyuge_1'] ?? 'No registrado' }}</td></tr>
            <tr><td class="label">Cónyuge 2</td><td>{{ $details['conyuge_2'] ?? 'No registrado' }}</td></tr>
            <tr><td class="label">Testigos</td><td>{{ is_array($testigos) && count($testigos) ? implode(', ', $testigos) : 'No registrados' }}</td></tr>
            <tr><td class="label">Género / dispensa</td><td>{{ ucfirst($details['genero_matrimonio'] ?? 'No registrado') }} · Dispensa: {{ $details['dispensa_matrimonial'] ?? 'No aplica' }}</td></tr>
        </table>
    @endif
    <div class="register">
        <div class="register-title">Referencia del archivo sacramental</div>
        Libro {{ $sacrament->libro ?: '-' }} &nbsp; · &nbsp; Folio {{ $sacrament->folio ?: '-' }} &nbsp; · &nbsp; Página {{ $sacrament->pagina ?: '-' }}<br />
        Tomo {{ $sacrament->tomo ?: '-' }} &nbsp; · &nbsp; Asiento {{ $sacrament->numero_asiento ?: '-' }}
    </div>
    @if($sacrament->notas)
        <div class="section-label">Observaciones</div>
        <div class="notes">{{ $sacrament->notas }}</div>
    @endif
    <div class="authentication">
        <p class="closing">Se expide la presente constancia en Calderón, el {{ $issuedAt->locale('es')->translatedFormat('j \d\e F \d\e Y') }}.</p>
        <table class="signatures"><tr>
            <td class="signature-cell">
                <div class="signature-line">{{ $priestName }}</div>
                <div class="signature-role">{{ $signatureTitle }} · Firma autorizada</div>
            </td>
            <td class="seal-cell">
                <div class="seal"></div>
                <div class="seal-caption">Sello parroquial</div>
            </td>
            <td class="qr-cell">
                <img class="qr" src="{{ $qrDataUri }}" alt="Código QR de verificación" />
                <div class="seal-caption">Verificación del registro</div>
            </td>
        </tr></table>
        <div class="verification">
            @if($isSample)
                <strong>MUESTRA DE DISEÑO · DATOS FICTICIOS · SIN VALIDEZ</strong>
            @else
                Escanea el código QR para consultar la autenticidad del registro en el portal parroquial.
            @endif
            <div class="issued">Emisión: {{ $issuedAt->format('d/m/Y · H:i') }}</div>
        </div>
    </div>
</body>
</html>
