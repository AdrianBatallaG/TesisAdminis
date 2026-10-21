<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ImportSqlite extends Command
{
    protected $signature = 'database:import-sqlite {source : Absolute path to a SQLite backup}';
    protected $description = 'Copy a SQLite backup into an empty, migrated MySQL database';

    public function handle(): int
    {
        $path = realpath($this->argument('source'));
        if (! $path || DB::connection()->getDriverName() !== 'mysql') {
            $this->error('Use an existing SQLite backup and DB_CONNECTION=mysql.');
            return self::FAILURE;
        }
        config(['database.connections.import_source' => [
            'driver' => 'sqlite', 'database' => $path, 'prefix' => '', 'foreign_key_constraints' => true,
        ]]);
        $source = DB::connection('import_source');
        $source->statement('PRAGMA query_only = ON');
        $tables = collect($source->select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
            ->pluck('name')->reject(fn ($name) => in_array($name, ['migrations']))->values()->all();
        $schema = DB::connection()->getSchemaBuilder();
        foreach ($tables as $table) {
            if (! $schema->hasTable($table) || DB::table($table)->exists()) {
                throw new RuntimeException("Destination table must exist and be empty: {$table}");
            }
        }
        // Insert parents first, keeping MySQL foreign-key checks enabled.
        $pending = $tables;
        $ordered = [];
        while ($pending) {
            $progress = false;
            foreach ($pending as $index => $table) {
                $parents = array_column($schema->getForeignKeys($table), 'foreign_table');
                if (array_intersect($parents, $pending)) {
                    continue;
                }
                $ordered[] = $table;
                unset($pending[$index]);
                $progress = true;
            }
            if (! $progress) {
                throw new RuntimeException('Circular foreign keys require a separate migration plan.');
            }
        }
        DB::transaction(function () use ($source, $ordered) {
            foreach ($ordered as $table) {
                $rows = $source->table($table)->get()->map(fn ($row) => (array) $row);
                foreach ($rows->chunk(100) as $batch) {
                    DB::table($table)->insert($batch->all());
                }
                if (DB::table($table)->count() !== $rows->count()) {
                    throw new RuntimeException("Row count mismatch: {$table}");
                }
                $this->line("{$table}: {$rows->count()}");
            }
        });
        $this->info('Import completed. IDs, relationships and password hashes were preserved.');
        return self::SUCCESS;
    }
}
