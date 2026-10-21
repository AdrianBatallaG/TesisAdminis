<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class TicketNotification extends Model {
 protected $guarded=['id'];
 public function ticket() { return $this->belongsTo(ServiceTicket::class, 'service_ticket_id'); }
 protected function casts(): array { return ['read_at'=>'datetime']; }
}
