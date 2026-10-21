<?php
namespace Tests\Feature;
use App\Models\{User, Sacrament, Donation, ServiceTicket};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\TestCase;
class CertificateLookupTest extends TestCase {
    use RefreshDatabase;
    protected function setUp(): void { parent::setUp(); $this->withHeader('Origin', 'http://localhost:5173'); }
    private function person($role='usuario'): User {
        Role::findOrCreate($role,'web');
        $user=User::factory()->create(['email_verified_at'=>now(),'is_active'=>true,'activity_blocked'=>false]);
        $user->assignRole($role); return $user;
    }
    private function document(User $user): ServiceTicket {
        $this->actingAs($user)->postJson('/api/sacramentos/solicitar-certificado',['nombres_completos'=>'Ana María López','cedula'=>'0123456789','tipo'=>'comunion','email'=>'contacto@example.test'])->assertCreated()->assertJsonPath('ticket.status','pendiente')->assertJsonMissingPath('record')->assertJsonMissingPath('found');
        return ServiceTicket::latest('id')->firstOrFail();
    }
    public function test_document_creates_ticket_without_matching_record_and_is_private(): void {
        $owner=$this->person(); $ticket=$this->document($owner);
        $this->getJson('/api/tickets/mios')->assertOk()->assertJsonCount(1);
        $this->getJson('/api/tickets')->assertForbidden();
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'tomar','version'=>0])->assertForbidden();
        $this->getJson('/api/tickets/'.$ticket->id.'/documento')->assertStatus(409);
        $this->actingAs($this->person())->getJson('/api/tickets/mios')->assertOk()->assertJsonCount(0);
        $this->getJson('/api/tickets/'.$ticket->id.'/documento')->assertForbidden();
    }
    public function test_document_can_be_delivered_only_by_assigned_staff_and_owner_can_download(): void {
        $owner=$this->person(); $ticket=$this->document($owner); $staff=$this->person('editor');
        $record=Sacrament::create(['tipo'=>'comunion','nombre'=>'Ana María','apellido'=>'López','cedula'=>'0123456789','fecha'=>'2015-05-20','numero_certificado'=>'CERT-TICKET']);
        $this->actingAs($staff)->patchJson('/api/tickets/'.$ticket->id,['action'=>'resolver','version'=>0,'response'=>'Listo','sacrament_id'=>$record->id,'confirmed'=>true])->assertStatus(409);
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'tomar','version'=>0])->assertOk()->assertJsonPath('status','en_revision');
        $this->actingAs($this->person('admin'))->patchJson('/api/tickets/'.$ticket->id,['action'=>'tomar','version'=>1])->assertStatus(409);
        $this->actingAs($staff)->patchJson('/api/tickets/'.$ticket->id,['action'=>'resolver','version'=>0,'response'=>'Listo','sacrament_id'=>$record->id,'confirmed'=>true])->assertStatus(409);
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'resolver','version'=>1,'response'=>'Certificado listo para descargar.','sacrament_id'=>$record->id,'confirmed'=>true])->assertOk()->assertJsonPath('document_ready',true);
        $this->actingAs($owner)->get('/api/tickets/'.$ticket->id.'/documento')->assertOk()->assertHeader('Content-Type','application/pdf');
        $this->actingAs($this->person())->getJson('/api/tickets/'.$ticket->id.'/documento')->assertForbidden();
    }
    public function test_document_requires_contact_and_sacrament_and_rejection_reaches_owner(): void {
        $owner=$this->person(); $this->actingAs($owner);
        foreach ([[],['cedula'=>'0123456789'],['nombres_completos'=>'Ana María López'],['nombres_completos'=>'Ana María López','cedula'=>'123']] as $payload) $this->postJson('/api/sacramentos/solicitar-certificado',$payload)->assertUnprocessable();
        $ticket=$this->document($owner);
        $this->actingAs($this->person('admin'))->patchJson('/api/tickets/'.$ticket->id,['action'=>'tomar','version'=>0])->assertOk();
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'rechazar','version'=>1])->assertUnprocessable();
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'rechazar','version'=>1,'response'=>'Acércate a secretaría para completar los datos.'])->assertOk()->assertJsonPath('status','rechazado');
        $this->actingAs($owner)->getJson('/api/tickets/mios')->assertJsonPath('0.response','Acércate a secretaría para completar los datos.');
    }
    public function test_admin_can_release_abandoned_ticket_and_other_staff_cannot(): void {
        $owner=$this->person(); $ticket=$this->document($owner);
        $this->actingAs($this->person('editor'))->patchJson('/api/tickets/'.$ticket->id,['action'=>'tomar','version'=>0])->assertOk();
        $this->actingAs($this->person('editor'))->patchJson('/api/tickets/'.$ticket->id,['action'=>'liberar','version'=>1])->assertForbidden();
        $this->actingAs($this->person('admin'))->patchJson('/api/tickets/'.$ticket->id,['action'=>'liberar','version'=>1])->assertOk()->assertJsonPath('assigned_to',null)->assertJsonPath('status','pendiente');
    }
    public function test_unverified_and_blocked_accounts_cannot_create_document_tickets(): void {
        foreach (['email_verified_at'=>null,'activity_blocked'=>true,'is_active'=>false] as $key=>$value) {
            $user=$this->person(); $user->forceFill([$key=>$value])->save();
            $this->actingAs($user)->postJson('/api/sacramentos/solicitar-certificado',['nombres_completos'=>'Persona Prueba','cedula'=>'0000000000'])->assertForbidden();
        }
        $this->assertDatabaseCount('service_tickets',0);
    }
    public function test_required_document_fields_and_private_optional_proof(): void {
        Storage::fake('local');
        $owner=$this->person(); $this->actingAs($owner);
        $payload=['nombres_completos'=>'Persona Prueba','cedula'=>'0000000000','tipo'=>'bautismo','email'=>'contacto@example.test'];
        foreach (array_keys($payload) as $key) {
            $missing=$payload; unset($missing[$key]);
            $this->postJson('/api/sacramentos/solicitar-certificado',$missing)->assertUnprocessable()->assertJsonValidationErrors($key);
        }
        $this->post('/api/sacramentos/solicitar-certificado',[...$payload,'comprobante'=>UploadedFile::fake()->image('pago.png')],['Accept'=>'application/json'])->assertCreated()->assertJsonPath('ticket.has_proof',true)->assertJsonMissingPath('ticket.proof_path')->assertJsonMissingPath('ticket.details.comprobante');
        $ticket=ServiceTicket::latest('id')->firstOrFail();
        Storage::disk('local')->assertExists($ticket->proof_path);
        $url='/api/tickets/'.$ticket->id.'/comprobante';
        $this->getJson($url)->assertForbidden();
        foreach (['editor','admin'] as $role) $this->actingAs($this->person($role))->get($url)->assertOk()->assertHeader('Content-Type','image/png');
        $this->actingAs($owner)->postJson('/api/sacramentos/solicitar-certificado',[...$payload,'comprobante'=>UploadedFile::fake()->create('invalid.txt',1,'text/plain')])->assertUnprocessable()->assertJsonValidationErrors('comprobante');
        $this->assertDatabaseCount('service_tickets',1);
    }
    private function donate(): Donation {
        Storage::fake('local');
        $this->postJson('/api/finanzas/donaciones/public',['nombre_donante'=>'Prueba','monto'=>25,'categoria'=>'ofrenda','comprobante'=>UploadedFile::fake()->image('deposito.png')])->assertCreated()->assertJsonPath('receipt.download_url',null)->assertJsonPath('receipt.review_status','pendiente');
        return Donation::firstOrFail();
    }
    public function test_pending_donation_blocks_all_receipts_and_financial_totals_until_approved(): void {
        $owner=$this->person(); $this->actingAs($owner); $donation=$this->donate();
        $ticket=ServiceTicket::firstOrFail();
        $public='/api/finanzas/donaciones/public/'.$donation->id;
        $token='?token='.$donation->public_receipt_token;
        $this->getJson($public.'/estado?token=wrong')->assertForbidden();
        $this->getJson($public.'/comprobante'.$token)->assertStatus(409);
        $this->getJson('/api/finanzas/donaciones/'.$donation->id.'/mi-comprobante')->assertStatus(409);
        $this->getJson('/api/tickets/mios')->assertJsonCount(1);
        $this->actingAs($this->person('editor'))->getJson('/api/dashboard/summary')->assertJsonPath('metrics.donaciones_mes',0);
        $this->getJson('/api/reportes/summary')->assertJsonCount(0,'financial_by_category');
        $this->getJson('/api/finanzas/donaciones/'.$donation->id.'/comprobante')->assertStatus(409);
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'tomar','version'=>0])->assertOk();
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'aprobar','version'=>1,'response'=>'Verificado'])->assertUnprocessable();
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'aprobar','version'=>1,'response'=>'Verificado','confirmed'=>true])->assertOk()->assertJsonPath('status','aprobado');
        $this->getJson('/api/dashboard/summary')->assertJsonPath('metrics.donaciones_mes',25);
        $this->getJson($public.'/estado'.$token)->assertOk()->assertJsonPath('review_status','aprobado');
        $this->get($public.'/comprobante'.$token)->assertOk()->assertHeader('Content-Type','application/pdf');
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'rechazar','version'=>2,'response'=>'Otra'])->assertStatus(409);
        $this->actingAs($owner)->get('/api/finanzas/donaciones/'.$donation->id.'/mi-comprobante')->assertOk();
    }
    public function test_rejected_guest_donation_is_trackable_but_has_no_receipt_or_income(): void {
        $donation=$this->donate(); $ticket=ServiceTicket::firstOrFail();
        $this->actingAs($this->person('admin'))->patchJson('/api/tickets/'.$ticket->id,['action'=>'tomar','version'=>0])->assertOk();
        $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'rechazar','version'=>1,'response'=>'No se encontró el depósito.'])->assertOk();
        $url='/api/finanzas/donaciones/public/'.$donation->id;
        $this->getJson($url.'/estado?token='.$donation->public_receipt_token)->assertJsonPath('review_status','rechazado')->assertJsonPath('download_url',null);
        $this->getJson($url.'/comprobante?token='.$donation->public_receipt_token)->assertStatus(409);
        $this->getJson('/api/reportes/summary')->assertJsonCount(0,'financial_by_category');
    }
}
