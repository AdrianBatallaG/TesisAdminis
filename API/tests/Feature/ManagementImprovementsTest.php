<?php
namespace Tests\Feature;
use Tests\TestCase;
use App\Models\{User,Donation,ServiceTicket,AuditLog};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
class ManagementImprovementsTest extends TestCase {
 use RefreshDatabase;
 protected function setUp():void {parent::setUp();$this->withHeader('Origin','http://localhost:5173');}
 private function person($role){Role::findOrCreate($role,'web');$u=User::factory()->create(['email_verified_at'=>now(),'is_active'=>true,'activity_blocked'=>false]);$u->assignRole($role);return $u;}
 public function test_ticket_donation_can_be_edited_without_approval_and_deleted_with_history():void {
 $admin=$this->person('admin');$owner=$this->person('usuario');
 $data=['nombre_donante'=>'Persona Prueba','tipo_movimiento'=>'ingreso','categoria'=>'ofrenda','monto'=>20,'fecha'=>'2026-10-07'];
 $d=Donation::create($data+['review_status'=>'pendiente']);$ticket=ServiceTicket::create(['type'=>'donacion','donation_id'=>$d->id,'user_id'=>$owner->id,'status'=>'pendiente']);
 $this->actingAs($owner)->putJson('/api/finanzas/donaciones/'.$d->id,$data)->assertForbidden();
 $this->actingAs($admin)->putJson('/api/finanzas/donaciones/'.$d->id,array_merge($data,['monto'=>30]))->assertOk()->assertJsonPath('review_status','pendiente');
 $this->assertEquals(30,$d->fresh()->monto);
 $this->getJson('/api/finanzas/donaciones/'.$d->id.'/comprobante')->assertStatus(409);
 $this->deleteJson('/api/finanzas/donaciones/'.$d->id)->assertOk();$this->assertSoftDeleted($d);$this->assertEquals('rechazado',$ticket->fresh()->status);$this->assertNotNull($ticket->fresh()->donation);
 $this->getJson('/api/finanzas/donaciones/'.$d->id.'/comprobante')->assertNotFound();
 }
 public function test_audit_export_obeys_filters_and_includes_all_matches():void {
 $admin=$this->person('admin');
 for($i=0;$i<205;$i++)AuditLog::create(['modulo'=>'finanzas','accion'=>'editar','descripcion'=>'MATCH-'.$i]);
 AuditLog::create(['modulo'=>'finanzas','accion'=>'crear','descripcion'=>'EXCLUDED-ACTION']);
 AuditLog::create(['modulo'=>'usuarios','accion'=>'editar','descripcion'=>'EXCLUDED-MODULE']);
 $this->actingAs($this->person('usuario'))->getJson('/api/admin/audit-logs/export')->assertForbidden();
 $r=$this->actingAs($admin)->get('/api/admin/audit-logs/export?modulo=finanzas&accion=editar')->assertOk();$csv=$r->streamedContent();
 $this->assertStringContainsString('MATCH-0',$csv);$this->assertStringContainsString('MATCH-204',$csv);$this->assertStringNotContainsString('EXCLUDED',$csv);$this->assertSame(205,substr_count($csv,'MATCH-'));
 }
 public function test_report_exports_respect_selected_year():void {
 $this->actingAs($this->person('admin'));
 foreach ([2025,2026] as $year) {
 \App\Models\Sacrament::create(['tipo'=>'bautismo','nombre'=>'Persona-'.$year,'fecha'=>$year.'-01-01','numero_certificado'=>'TEST-'.$year]);
 Donation::create(['nombre_donante'=>'Donante-'.$year,'tipo_movimiento'=>'ingreso','categoria'=>'ofrenda','monto'=>10,'fecha'=>$year.'-01-01','review_status'=>'aprobado']);
 }
 foreach (['sacramentos'=>'Persona','finanzas'=>'Donante'] as $kind=>$name) {
 $csv=$this->get('/api/reportes/export/'.$kind.'.csv?year=2026')->assertOk()->streamedContent();
 $this->assertStringContainsString($name.'-2026',$csv);
 $this->assertStringNotContainsString($name.'-2025',$csv);
 $this->getJson('/api/reportes/export/'.$kind.'.csv?year=invalid')->assertUnprocessable();
 }
 }
}
