<?php
namespace Tests\Feature;
use App\Models\{User,ServiceTicket,TicketNotification};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;
class TicketNotificationTest extends TestCase {
 use RefreshDatabase;
 protected function setUp(): void { parent::setUp(); $this->withHeader('Origin','http://localhost:5173'); }
 private function person($role='usuario',$verified=true): User {
  Role::findOrCreate($role,'web'); $u=User::factory()->create(['email_verified_at'=>$verified?now():null,'is_active'=>true,'activity_blocked'=>false]);$u->assignRole($role);return $u;
 }
 public function test_notification_recipients_read_isolation_and_response():void {
  $this->withHeader('Origin','http://localhost:5173');
  $admin=$this->person('admin');$editor=$this->person('editor');$unverified=$this->person('editor',false);$owner=$this->person();$other=$this->person();
  $this->actingAs($owner)->postJson('/api/sacramentos/solicitar-certificado',['nombres_completos'=>'Persona Prueba','cedula'=>'0123456789','tipo'=>'bautismo','email'=>'test@example.test'])->assertCreated();
  $ticket=ServiceTicket::firstOrFail();
  $this->assertDatabaseCount('ticket_notifications',2);
  $n=TicketNotification::where('user_id',$admin->id)->firstOrFail();
  $this->actingAs($other)->getJson('/api/notificaciones')->assertOk()->assertJsonPath('unread_count',0);
  $this->patchJson('/api/notificaciones/'.$n->id.'/leida')->assertNotFound();
  $this->actingAs($admin)->getJson('/api/notificaciones')->assertOk()->assertJsonPath('unread_count',1)->assertJsonPath('items.0.url','/tickets');
  $this->patchJson('/api/notificaciones/'.$n->id.'/leida')->assertNoContent();
  $this->getJson('/api/notificaciones')->assertJsonPath('unread_count',0);
  $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'tomar','version'=>0])->assertOk();
  $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'responder','version'=>1,'response'=>'Estamos revisando tu solicitud.'])->assertOk()->assertJsonPath('status','en_revision')->assertJsonPath('resolved_at',null);
  $this->assertDatabaseHas('ticket_notifications',['user_id'=>$owner->id,'service_ticket_id'=>$ticket->id]);
  $this->patchJson('/api/tickets/'.$ticket->id,['action'=>'rechazar','version'=>2,'response'=>'Revisa tus datos.'])->assertOk();
  $this->actingAs($owner)->getJson('/api/notificaciones')->assertOk()->assertJsonPath('unread_count',2)->assertJsonPath('items.0.ticket_id',$ticket->id)->assertJsonPath('items.0.url','/solicitudes');
  $editor->syncRoles('usuario');
  $this->actingAs($editor)->getJson('/api/notificaciones')->assertJsonPath('unread_count',0);
  $this->actingAs($unverified)->getJson('/api/notificaciones')->assertForbidden();
 }
 public function test_guests_unverified_and_staff_cannot_request_documents():void {
  $this->postJson('/api/sacramentos/solicitar-certificado',[])->assertUnauthorized();
  foreach ([$this->person('usuario',false),$this->person('admin'),$this->person('editor')] as $user) $this->actingAs($user)->postJson('/api/sacramentos/solicitar-certificado',[])->assertForbidden();
  $this->assertDatabaseCount('service_tickets',0);
 }
 public function test_donation_notifications_and_transaction_rollback():void {
  $admin=$this->person('admin');$owner=$this->person();
  $ticket=ServiceTicket::create(['type'=>'donacion','status'=>'pendiente','user_id'=>$owner->id,'details'=>[]]);
  $ticket->update(['status'=>'aprobado','response'=>'Comprobante confirmado']);
  $this->actingAs($owner)->getJson('/api/notificaciones')->assertOk()->assertJsonPath('items.0.url','/mi-cuenta');
  $before=TicketNotification::count();
  try { \Illuminate\Support\Facades\DB::transaction(function()use($owner){ ServiceTicket::create(['type'=>'documento','status'=>'pendiente','user_id'=>$owner->id]);throw new \RuntimeException('rollback'); }); } catch(\RuntimeException $e) {}
  $this->assertDatabaseCount('ticket_notifications',$before);
 }
 public function test_dashboard_counts_only_open_tickets_and_protects_summary():void {
  $owner=$this->person();$admin=$this->person('admin');
  ServiceTicket::create(['type'=>'documento','status'=>'pendiente','user_id'=>$owner->id]);
  ServiceTicket::create(['type'=>'donacion','status'=>'en_revision','user_id'=>$owner->id]);
  ServiceTicket::create(['type'=>'documento','status'=>'resuelto','user_id'=>$owner->id]);
  $this->actingAs($owner)->getJson('/api/dashboard/summary')->assertForbidden();
  $this->actingAs($admin)->getJson('/api/dashboard/summary')->assertOk()->assertJsonPath('tickets.counts.documento',1)->assertJsonPath('tickets.counts.donacion',1)->assertJsonCount(2,'tickets.recent');
 }
}
