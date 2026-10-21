<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndUsersSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $roles = ['usuario', 'editor', 'admin'];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $permissions = [
            'dashboard.view',
            'sacraments.view',
            'sacraments.create',
            'sacraments.update',
            'sacraments.delete',
            'sacraments.certificate',
            'sacraments.request_certificate',
            'sacraments.view_own',
            'members.view',
            'members.create',
            'members.update',
            'members.delete',
            'events.view',
            'events.create',
            'events.update',
            'events.delete',
            'events.attendance',
            'visits.view',
            'visits.create',
            'visits.update',
            'visits.delete',
            'schedules.view',
            'schedules.create',
            'schedules.update',
            'schedules.delete',
            'finance.view',
            'finance.create',
            'finance.update',
            'finance.delete',
            'finance.donate_public',
            'finance.receipt_own',
            'content.view',
            'content.create',
            'content.update',
            'content.delete',
            'users.view',
            'users.manage_roles',
            'users.block_activity',
            'users.delete',
            'reports.view',
            'reports.export',
            'audit.view',
            'profile.view_own',
            'profile.update_own',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        /** @var Role $adminRole */
        $adminRole = Role::query()->where('name', 'admin')->firstOrFail();
        /** @var Role $editorRole */
        $editorRole = Role::query()->where('name', 'editor')->firstOrFail();
        /** @var Role $usuarioRole */
        $usuarioRole = Role::query()->where('name', 'usuario')->firstOrFail();

        $adminRole->syncPermissions($permissions);
        $editorRole->syncPermissions([
            'dashboard.view',
            'sacraments.view',
            'sacraments.create',
            'sacraments.update',
            'sacraments.certificate',
            'members.view',
            'members.create',
            'members.update',
            'events.view',
            'events.create',
            'events.update',
            'events.attendance',
            'visits.view',
            'visits.create',
            'visits.update',
            'schedules.view',
            'schedules.create',
            'schedules.update',
            'finance.view',
            'finance.create',
            'finance.update',
            'content.view',
            'content.create',
            'content.update',
            'reports.view',
            'reports.export',
            'profile.view_own',
            'profile.update_own',
            'sacraments.view_own',
            'finance.receipt_own',
        ]);
        $usuarioRole->syncPermissions([
            'content.view',
            'events.view',
            'visits.view',
            'schedules.view',
            'finance.donate_public',
            'finance.receipt_own',
            'sacraments.request_certificate',
            'sacraments.view_own',
            'profile.view_own',
            'profile.update_own',
        ]);

        $this->command?->info('Seeder completado: roles y permisos sincronizados. Usa php artisan users:create-admin para crear el primer acceso.');
    }
}
