<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Create bank_accounts table
        Schema::create('bank_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('bank_name')->default('Mandiri');
            $table->string('account_number');
            $table->string('account_holder')->default('Indah Arini Puspitasari');
            $table->string('label')->nullable();
            $table->timestamps();
        });

        // Seed default bank accounts
        $accounts = [
            ['bank_name' => 'Mandiri', 'account_number' => '1370500743444', 'account_holder' => 'Indah Arini Puspitasari', 'label' => 'Mandiri Rekening Bersama Partnership'],
            ['bank_name' => 'Mandiri', 'account_number' => '1370500132333', 'account_holder' => 'Indah Arini Puspitasari', 'label' => 'Mandiri Toscana/Arayya/Abrenara/Cendana'],
            ['bank_name' => 'Mandiri', 'account_number' => '1370016428316', 'account_holder' => 'Indah Arini Puspitasari', 'label' => 'Mandiri Pavilo A/Terakota/Villahoms'],
            ['bank_name' => 'Mandiri', 'account_number' => '1370025260452', 'account_holder' => 'Indah Arini Puspitasari', 'label' => 'Mandiri Sapphire'],
            ['bank_name' => 'Mandiri', 'account_number' => '1370022092775', 'account_holder' => 'Indah Arini Puspitasari', 'label' => 'Mandiri Ancala'],
            ['bank_name' => 'Mandiri', 'account_number' => '1370500134222', 'account_holder' => 'Indah Arini Puspitasari', 'label' => 'Mandiri Alvera'],
            ['bank_name' => 'Mandiri', 'account_number' => '1370022099432', 'account_holder' => 'Indah Arini Puspitasari', 'label' => 'Mandiri Azure Stay'],
            ['bank_name' => 'Mandiri', 'account_number' => '1370022093849', 'account_holder' => 'Indah Arini Puspitasari', 'label' => 'Mandiri Sunrise'],
        ];

        foreach ($accounts as $acc) {
            DB::table('bank_accounts')->insert(array_merge($acc, ['created_at' => now(), 'updated_at' => now()]));
        }

        // 2. Add bank_account_id & ownership details to properties table
        Schema::table('properties', function (Blueprint $table) {
            $table->foreignId('bank_account_id')->nullable()->constrained('bank_accounts')->onDelete('set null');
            $table->string('ownership_model')->default('rented'); // owned, rented, partnership
            $table->decimal('owner_split_pct', 5, 2)->default(100.00);
            $table->decimal('investor_split_pct', 5, 2)->default(0.00);
            $table->unsignedInteger('monthly_rent_cost')->default(0); // rent per month
            $table->unsignedInteger('monthly_mortgage_cost')->default(0); // mortgage installment per month
            $table->unsignedInteger('mortgage_interest_monthly')->default(0); // interest expense portion per month
            $table->unsignedInteger('initial_build_capital')->default(0); // BEP build capital
            $table->unsignedInteger('lease_capital')->default(0); // BEP lease capital
        });

        // 3. Add alternative phone & commission_pct to bookings table
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('guest_phone_alternative', 20)->nullable()->after('guest_phone');
            $table->decimal('commission_pct', 5, 2)->default(0.00)->after('source');
        });

        // 4. Create bank_mutations table
        Schema::create('bank_mutations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('bank_account_id')->constrained('bank_accounts')->onDelete('cascade');
            $table->datetime('trx_at');
            $table->decimal('amount', 12, 2);
            $table->enum('direction', ['kredit', 'debit']);
            $table->string('sender_name')->nullable();
            $table->text('description')->nullable();
            $table->string('external_ref')->unique()->nullable();
            $table->enum('source', ['manual', 'impor', 'moota'])->default('manual');
            $table->enum('status', ['baru', 'cocok', 'diabaikan'])->default('baru');
            $table->unsignedBigInteger('matched_payment_id')->nullable(); // linked payment id
            $table->timestamp('imported_at')->useCurrent();
            $table->timestamps();
        });

        // 5. Add reconciliation columns to payments table
        Schema::table('payments', function (Blueprint $table) {
            $table->string('status', 20)->default('cocok'); // default cocok for existing rows: menunggu, cocok, ditolak
            $table->unsignedSmallInteger('unique_code')->default(0);
            $table->decimal('expected_amount', 12, 2)->nullable();
            $table->unsignedBigInteger('matched_mutation_id')->nullable();
            $table->timestamp('matched_at')->nullable();
            $table->foreignId('matched_by')->nullable()->constrained('users')->onDelete('set null');
        });

        // 6. Create employee_loans table (casbon)
        Schema::create('employee_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('users')->onDelete('cascade');
            $table->decimal('amount', 12, 2);
            $table->date('disbursed_at');
            $table->enum('status', ['active', 'paid', 'written_off'])->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // 7. Create employee_loan_payments table
        Schema::create('employee_loan_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_loan_id')->constrained('employee_loans')->onDelete('cascade');
            $table->decimal('amount', 12, 2);
            $table->date('paid_at');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });

        // 8. Update properties parameters based on name matching
        $this->updatePropertiesOwnershipAndAccounts();

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Update existing properties with correct bank account mapping, ownership model, and split details
     */
    private function updatePropertiesOwnershipAndAccounts(): void
    {
        $db = DB::connection();

        // Helper to get bank account ID
        $getBankAccountId = function ($num) use ($db) {
            return $db->table('bank_accounts')->where('account_number', $num)->value('id');
        };

        $accPartnership = $getBankAccountId('1370500743444');
        $accToscana = $getBankAccountId('1370500132333');
        $accVillahoms = $getBankAccountId('1370016428316');
        $accSapphire = $getBankAccountId('1370025260452');
        $accAncala = $getBankAccountId('1370022092775');
        $accAlvera = $getBankAccountId('1370500134222');
        $accAzure = $getBankAccountId('1370022099432');
        $accSunrise = $getBankAccountId('1370022093849');

        // Setup property maps
        $propertySpecs = [
            // Milik Sendiri (Owned)
            'terakota' => [
                'bank_account_id' => $accVillahoms,
                'ownership_model' => 'owned',
                'owner_split_pct' => 100.00,
                'investor_split_pct' => 0.00,
                'monthly_mortgage_cost' => 4000000,
                'mortgage_interest_monthly' => 1500000,
                'initial_build_capital' => 750000000,
            ],
            // Sewa (Rented)
            'pavilo-a' => [
                'bank_account_id' => $accVillahoms,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 3000000, // Rp 36jt / year
                'lease_capital' => 36000000,
            ],
            'sapphire' => [
                'bank_account_id' => $accSapphire,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 4000000, // Rp 48jt / year
                'lease_capital' => 48000000,
            ],
            'toscana' => [
                'bank_account_id' => $accToscana,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 5000000, // Rp 60jt / year
                'lease_capital' => 60000000,
            ],
            'alvera' => [
                'bank_account_id' => $accAlvera,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 4000000, // Rp 48jt / year
                'lease_capital' => 48000000,
            ],
            'ancala' => [
                'bank_account_id' => $accAncala,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 5000000, // Rp 60jt / year
                'lease_capital' => 60000000,
            ],
            'cendana' => [
                'bank_account_id' => $accToscana,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 4000000, // Rp 48jt / year
                'lease_capital' => 48000000,
            ],
            'abrenara' => [
                'bank_account_id' => $accToscana,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 4000000, // Rp 48jt / year
                'lease_capital' => 48000000,
            ],
            'arayya' => [
                'bank_account_id' => $accToscana,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 4000000, // Rp 48jt / year
                'lease_capital' => 48000000,
            ],
            'azure' => [
                'bank_account_id' => $accAzure,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 4000000, // Rp 48jt / year
                'lease_capital' => 48000000,
            ],
            'sunrise' => [
                'bank_account_id' => $accSunrise,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 4000000, // Rp 48jt / year
                'lease_capital' => 48000000,
            ],
            'villahoms' => [
                'bank_account_id' => $accVillahoms,
                'ownership_model' => 'rented',
                'monthly_rent_cost' => 4000000, // Rp 48jt / year
                'lease_capital' => 48000000,
            ],
            // Kerjasama (Partnership) 50-50
            'pavilo-b' => [
                'bank_account_id' => $accPartnership,
                'ownership_model' => 'partnership',
                'owner_split_pct' => 50.00,
                'investor_split_pct' => 50.00,
                'initial_build_capital' => 200000000,
            ],
            'cakrawala' => [
                'bank_account_id' => $accPartnership,
                'ownership_model' => 'partnership',
                'owner_split_pct' => 50.00,
                'investor_split_pct' => 50.00,
                'initial_build_capital' => 200000000,
            ],
            'sunshine' => [
                'bank_account_id' => $accPartnership,
                'ownership_model' => 'partnership',
                'owner_split_pct' => 50.00,
                'investor_split_pct' => 50.00,
                'initial_build_capital' => 200000000,
            ],
            'sunset' => [
                'bank_account_id' => $accPartnership,
                'ownership_model' => 'partnership',
                'owner_split_pct' => 50.00,
                'investor_split_pct' => 50.00,
                'initial_build_capital' => 200000000,
            ],
            'sunday' => [
                'bank_account_id' => $accPartnership,
                'ownership_model' => 'partnership',
                'owner_split_pct' => 50.00,
                'investor_split_pct' => 50.00,
                'initial_build_capital' => 200000000,
            ],
            // Kerjasama (Partnership) 40-60
            'emerald' => [
                'bank_account_id' => $accPartnership,
                'ownership_model' => 'partnership',
                'owner_split_pct' => 40.00,
                'investor_split_pct' => 60.00,
                'initial_build_capital' => 300000000,
            ],
            'abaia' => [
                'bank_account_id' => $accPartnership,
                'ownership_model' => 'partnership',
                'owner_split_pct' => 40.00,
                'investor_split_pct' => 60.00,
                'initial_build_capital' => 300000000,
            ],
            'cubic' => [
                'bank_account_id' => $accPartnership,
                'ownership_model' => 'partnership',
                'owner_split_pct' => 40.00,
                'investor_split_pct' => 60.00,
                'initial_build_capital' => 300000000,
            ],
        ];

        foreach ($propertySpecs as $slugPart => $values) {
            $db->table('properties')
                ->where('slug', 'like', "%{$slugPart}%")
                ->update($values);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('employee_loan_payments');
        Schema::dropIfExists('employee_loans');

        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['status', 'unique_code', 'expected_amount', 'matched_mutation_id', 'matched_at', 'matched_by']);
        });

        Schema::dropIfExists('bank_mutations');

        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['guest_phone_alternative', 'commission_pct']);
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->dropConstrainedForeignId('bank_account_id');
            $table->dropColumn([
                'ownership_model',
                'owner_split_pct',
                'investor_split_pct',
                'monthly_rent_cost',
                'monthly_mortgage_cost',
                'mortgage_interest_monthly',
                'initial_build_capital',
                'lease_capital',
            ]);
        });

        Schema::dropIfExists('bank_accounts');
    }
};
