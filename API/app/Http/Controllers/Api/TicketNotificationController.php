<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\TicketNotification;
use Illuminate\Http\Request;
class TicketNotificationController extends Controller {
 private function visible(Request $request) {
  $query=TicketNotification::where('user_id',$request->user()->id);
  if (!$request->user()->hasAnyRole(['admin','editor'])) $query->where('audience','requester');
  return $query;
 }
 public function index(Request $request) {
  $query=$this->visible($request);
  return ['unread_count'=>(clone $query)->whereNull('read_at')->count(),'items'=>$query->with('ticket:id,type')->orderByRaw('read_at IS NULL DESC')->latest('id')->limit(30)->get()->map(fn($n)=>[
   'id'=>$n->id,'ticket_id'=>$n->service_ticket_id,'message'=>$n->message,'read_at'=>$n->read_at,'created_at'=>$n->created_at,
   'url'=>$n->audience==='staff'?'/tickets':('/'.(($n->ticket?->type === 'donacion' || $request->user()->hasAnyRole(['admin','editor']))?'mi-cuenta':'solicitudes')),
  ])];
 }
 public function read(Request $request,int $id) { $n=$this->visible($request)->findOrFail($id); if(!$n->read_at){$n->read_at=now();$n->save();}return response()->noContent(); }
}
