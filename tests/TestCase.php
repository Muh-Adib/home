<?php

namespace Tests;

use Illuminate\Database\Connection;
use Illuminate\Database\SQLiteConnection;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        Connection::resolverFor('sqlite', function ($connection, $database, $prefix, $config) {
            return new class($connection, $database, $prefix, $config) extends SQLiteConnection
            {
                protected function executeBeginTransactionStatement()
                {
                    if ($this->getPdo()->inTransaction()) {
                        return;
                    }
                    $this->getPdo()->beginTransaction();
                }
            };
        });

        if (app()->bound('db')) {
            app('db')->purge('sqlite');
        }

        parent::setUp();
    }
}
