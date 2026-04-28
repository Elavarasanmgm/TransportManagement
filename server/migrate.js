const { getPool, sql } = require('./db');

async function migrate() {
  const pool = await getPool();

  // ── VehicleTypes table ────────────────────────────────────────────────────
  // Create without global UNIQUE on Name; uniqueness is per-company
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'VehicleTypes')
    BEGIN
      CREATE TABLE VehicleTypes (
        Id        INT IDENTITY(1,1) PRIMARY KEY,
        Name      NVARCHAR(50)  NOT NULL,
        Emoji     NVARCHAR(10)  DEFAULT N'🚛',
        OrderNo   INT           DEFAULT 0,
        CompanyId INT           NULL
      );
      PRINT 'VehicleTypes table created.';
    END
  `);

  // ── Users table ───────────────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
    BEGIN
      CREATE TABLE Users (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        Username     NVARCHAR(100) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(MAX) NOT NULL,
        FullName     NVARCHAR(200),
        Role         NVARCHAR(50)  DEFAULT 'admin',
        CompanyId    INT           NULL,
        CreatedAt    DATETIME      DEFAULT GETDATE()
      );
      PRINT 'Users table created.';
    END
  `);

  // ── CompanySettings table ─────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CompanySettings')
    BEGIN
      CREATE TABLE CompanySettings (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        CompanyName NVARCHAR(200) NOT NULL,
        Logo        NVARCHAR(MAX),
        UpdatedAt   DATETIME      DEFAULT GETDATE()
      );
      PRINT 'CompanySettings table created.';
    END
  `);

  // ── Add DriverId / CustomerId to Users (for role-based linking) ─────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'DriverId')
      ALTER TABLE Users ADD DriverId INT NULL
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'CustomerId')
      ALTER TABLE Users ADD CustomerId INT NULL
  `);

  // ── Add CompanyId to existing tables (idempotent) ─────────────────────────
  const addCompanyIdStmts = [
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'CompanyId')
     ALTER TABLE Users ADD CompanyId INT NULL`,

    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VehicleTypes') AND name = 'CompanyId')
     ALTER TABLE VehicleTypes ADD CompanyId INT NULL`,

    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles') AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicles') AND name = 'CompanyId')
     ALTER TABLE Vehicles ADD CompanyId INT NULL`,

    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Rentals') AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Rentals') AND name = 'CompanyId')
     ALTER TABLE Rentals ADD CompanyId INT NULL`,

    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Expenses') AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Expenses') AND name = 'CompanyId')
     ALTER TABLE Expenses ADD CompanyId INT NULL`,

    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Drivers') AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Drivers') AND name = 'CompanyId')
     ALTER TABLE Drivers ADD CompanyId INT NULL`,

    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Attendance') AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Attendance') AND name = 'CompanyId')
     ALTER TABLE Attendance ADD CompanyId INT NULL`,

    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers') AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'CompanyId')
     ALTER TABLE Customers ADD CompanyId INT NULL`,
  ];

  for (const stmt of addCompanyIdStmts) {
    await pool.request().query(stmt);
  }

  // ── Fix VehicleTypes: drop single-column unique constraint on Name ─────────
  // The original schema had UNIQUE on Name alone — must change to (Name, CompanyId)
  await pool.request().query(`
    DECLARE @cn NVARCHAR(200)
    SELECT TOP 1 @cn = kc.name
    FROM sys.key_constraints kc
    JOIN sys.index_columns ic
      ON kc.unique_index_id = ic.index_id AND kc.parent_object_id = ic.object_id
    WHERE OBJECT_NAME(kc.parent_object_id) = 'VehicleTypes'
      AND kc.type = 'UQ'
    GROUP BY kc.name
    HAVING COUNT(*) = 1
    IF @cn IS NOT NULL
      EXEC('ALTER TABLE VehicleTypes DROP CONSTRAINT [' + @cn + ']')
  `);

  // ── Add compound unique index on VehicleTypes(Name, CompanyId) ───────────
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.indexes
      WHERE object_id = OBJECT_ID('VehicleTypes')
        AND name = 'UQ_VehicleTypes_Name_CompanyId'
    )
    CREATE UNIQUE INDEX UQ_VehicleTypes_Name_CompanyId
      ON VehicleTypes(Name, CompanyId)
      WHERE CompanyId IS NOT NULL
  `);

  // ── Backfill existing rows to CompanyId = 1 ───────────────────────────────
  await pool.request().query(`
    IF EXISTS (SELECT * FROM CompanySettings WHERE Id = 1)
    BEGIN
      UPDATE Users        SET CompanyId = 1 WHERE CompanyId IS NULL
      UPDATE VehicleTypes SET CompanyId = 1 WHERE CompanyId IS NULL
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
        UPDATE Vehicles   SET CompanyId = 1 WHERE CompanyId IS NULL
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Rentals')
        UPDATE Rentals    SET CompanyId = 1 WHERE CompanyId IS NULL
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Expenses')
        UPDATE Expenses   SET CompanyId = 1 WHERE CompanyId IS NULL
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Drivers')
        UPDATE Drivers    SET CompanyId = 1 WHERE CompanyId IS NULL
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Attendance')
        UPDATE Attendance SET CompanyId = 1 WHERE CompanyId IS NULL
      IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
        UPDATE Customers  SET CompanyId = 1 WHERE CompanyId IS NULL
      PRINT 'Backfilled CompanyId = 1 for all existing rows.'
    END
  `);

  // ── Seed VehicleTypes for CompanyId=1 if none seeded yet ─────────────────
  await pool.request().query(`
    IF EXISTS (SELECT * FROM CompanySettings WHERE Id = 1)
    AND NOT EXISTS (SELECT * FROM VehicleTypes WHERE CompanyId = 1)
    BEGIN
      INSERT INTO VehicleTypes (Name, Emoji, OrderNo, CompanyId) VALUES
        (N'Lorry',   N'🚛', 1, 1),
        (N'JCB',     N'🚜', 2, 1),
        (N'Tractor', N'🚜', 3, 1),
        (N'Car',     N'🚗', 4, 1)
      PRINT 'Seeded VehicleTypes for CompanyId=1.'
    END
  `);

  // ── Add HourlyRate to Vehicles ───────────────────────────────────────────
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
    AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicles') AND name = 'HourlyRate')
      ALTER TABLE Vehicles ADD HourlyRate DECIMAL(10,2) DEFAULT 0
  `);

  // ── Add missing columns to Rentals ──────────────────────────────────────
  const rentalCols = [
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Rentals')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Rentals') AND name = 'HourlyRate')
       ALTER TABLE Rentals ADD HourlyRate DECIMAL(10,2) DEFAULT 0`,
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Rentals')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Rentals') AND name = 'Hours')
       ALTER TABLE Rentals ADD Hours INT DEFAULT 0`,
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Rentals')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Rentals') AND name = 'RateType')
       ALTER TABLE Rentals ADD RateType NVARCHAR(10) DEFAULT 'daily'`,
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Rentals')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Rentals') AND name = 'Discount')
       ALTER TABLE Rentals ADD Discount DECIMAL(10,2) DEFAULT 0`,
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Rentals')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Rentals') AND name = 'ContractNo')
       ALTER TABLE Rentals ADD ContractNo NVARCHAR(30) NULL`,
  ];
  for (const s of rentalCols) await pool.request().query(s);

  // ── Add vehicle document expiry fields ───────────────────────────────────
  const vehicleDocCols = [
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicles') AND name = 'InsuranceExpiry')
       ALTER TABLE Vehicles ADD InsuranceExpiry DATE NULL`,
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicles') AND name = 'RCExpiry')
       ALTER TABLE Vehicles ADD RCExpiry DATE NULL`,
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicles') AND name = 'FitnessExpiry')
       ALTER TABLE Vehicles ADD FitnessExpiry DATE NULL`,
    `IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
     AND NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Vehicles') AND name = 'PermitExpiry')
       ALTER TABLE Vehicles ADD PermitExpiry DATE NULL`,
  ];
  for (const s of vehicleDocCols) await pool.request().query(s);

  // ── Add extra fields to CompanySettings ────────────────────────────────
  const companyExtraCols = [
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompanySettings') AND name = 'Address')
       ALTER TABLE CompanySettings ADD Address NVARCHAR(300) NULL`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompanySettings') AND name = 'Phone')
       ALTER TABLE CompanySettings ADD Phone NVARCHAR(20) NULL`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompanySettings') AND name = 'Email')
       ALTER TABLE CompanySettings ADD Email NVARCHAR(150) NULL`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompanySettings') AND name = 'GSTNo')
       ALTER TABLE CompanySettings ADD GSTNo NVARCHAR(50) NULL`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompanySettings') AND name = 'BankName')
       ALTER TABLE CompanySettings ADD BankName NVARCHAR(100) NULL`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompanySettings') AND name = 'BankAccount')
       ALTER TABLE CompanySettings ADD BankAccount NVARCHAR(50) NULL`,
    `IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('CompanySettings') AND name = 'IFSC')
       ALTER TABLE CompanySettings ADD IFSC NVARCHAR(20) NULL`,
  ];
  for (const s of companyExtraCols) await pool.request().query(s);

  // ── Create Payments table ────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
    BEGIN
      CREATE TABLE Payments (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        RentalId    INT           NOT NULL REFERENCES Rentals(Id) ON DELETE CASCADE,
        Amount      DECIMAL(12,2) NOT NULL,
        PaidOn      DATE          NOT NULL,
        Method      NVARCHAR(30)  DEFAULT 'Cash',
        Note        NVARCHAR(250),
        CompanyId   INT           NOT NULL,
        CreatedAt   DATETIME      DEFAULT GETDATE()
      );
      PRINT 'Payments table created.';
    END
  `);

  // ── Fix Vehicles.RegNo: drop global unique, add per-company unique ───────
  await pool.request().query(`
    DECLARE @cn2 NVARCHAR(200)
    SELECT TOP 1 @cn2 = kc.name
    FROM sys.key_constraints kc
    JOIN sys.index_columns ic
      ON kc.unique_index_id = ic.index_id AND kc.parent_object_id = ic.object_id
    JOIN sys.columns c
      ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE OBJECT_NAME(kc.parent_object_id) = 'Vehicles'
      AND kc.type = 'UQ'
      AND c.name = 'RegNo'
    GROUP BY kc.name
    HAVING COUNT(*) = 1
    IF @cn2 IS NOT NULL
      EXEC('ALTER TABLE Vehicles DROP CONSTRAINT [' + @cn2 + ']')
  `);
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.indexes
      WHERE object_id = OBJECT_ID('Vehicles')
        AND name = 'UQ_Vehicles_RegNo_CompanyId'
    )
    AND EXISTS (
      SELECT * FROM sys.columns
      WHERE object_id = OBJECT_ID('Vehicles') AND name = 'CompanyId'
    )
    CREATE UNIQUE INDEX UQ_Vehicles_RegNo_CompanyId
      ON Vehicles(RegNo, CompanyId)
      WHERE CompanyId IS NOT NULL
  `);

  // ── VehicleDocumentTypes ──────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'VehicleDocumentTypes') AND type='U')
    CREATE TABLE VehicleDocumentTypes (
      Id                 INT IDENTITY PRIMARY KEY,
      Name               NVARCHAR(100) NOT NULL,
      Emoji              NVARCHAR(10)  DEFAULT '📄',
      DefaultValidityDays INT          DEFAULT 365,
      IsSystem           BIT           DEFAULT 0,
      CompanyId          INT           NOT NULL,
      CreatedAt          DATETIME      DEFAULT GETDATE()
    )
  `);

  // ── VehicleDocuments ──────────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'VehicleDocuments') AND type='U')
    CREATE TABLE VehicleDocuments (
      Id          INT IDENTITY PRIMARY KEY,
      VehicleId   INT           NOT NULL,
      VehicleName NVARCHAR(150) DEFAULT '',
      TypeId      INT           NOT NULL,
      TypeName    NVARCHAR(100) DEFAULT '',
      DocNo       NVARCHAR(100) DEFAULT '',
      IssueDate   DATE          NULL,
      ExpiryDate  DATE          NULL,
      Notes       NVARCHAR(500) DEFAULT '',
      CompanyId   INT           NOT NULL,
      UpdatedAt   DATETIME      DEFAULT GETDATE()
    )
  `);

  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM sys.indexes
      WHERE object_id = OBJECT_ID('VehicleDocuments') AND name = 'UQ_VehicleDocuments_VehicleType'
    )
    CREATE UNIQUE INDEX UQ_VehicleDocuments_VehicleType
      ON VehicleDocuments(VehicleId, TypeId, CompanyId)
  `);

  // ── Add file upload columns to VehicleDocuments (idempotent) ──────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VehicleDocuments') AND name = 'FileName')
      ALTER TABLE VehicleDocuments ADD FileName NVARCHAR(260) NULL
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VehicleDocuments') AND name = 'FileType')
      ALTER TABLE VehicleDocuments ADD FileType NVARCHAR(100) NULL
  `);
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('VehicleDocuments') AND name = 'FileData')
      ALTER TABLE VehicleDocuments ADD FileData NVARCHAR(MAX) NULL
  `);

  // ── Seed VehicleDocumentTypes (company 1) ────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM VehicleDocumentTypes WHERE CompanyId=1 AND IsSystem=1)
    BEGIN
      INSERT INTO VehicleDocumentTypes (Name, Emoji, DefaultValidityDays, IsSystem, CompanyId) VALUES
        (N'Insurance',       N'📋', 365,  1, 1),
        (N'Road Tax',        N'💰', 365,  1, 1),
        (N'RC (Registration Certificate)', N'🚗', 1825, 1, 1),
        (N'Fitness Certificate', N'✅', 730,  1, 1),
        (N'Permit',          N'📄', 365,  1, 1),
        (N'Pollution (PUC)', N'🌿', 180,  1, 1),
        (N'National Permit', N'🗺️', 365,  1, 1)
    END
  `);

  // ── MaintenanceTypes ──────────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'MaintenanceTypes') AND type='U')
    CREATE TABLE MaintenanceTypes (
      Id                  INT IDENTITY PRIMARY KEY,
      Name                NVARCHAR(100) NOT NULL,
      Emoji               NVARCHAR(10)  DEFAULT '🔧',
      DefaultKmInterval   INT           NULL,
      DefaultDaysInterval INT           NULL,
      IsSystem            BIT           DEFAULT 0,
      CompanyId           INT           NOT NULL,
      CreatedAt           DATETIME      DEFAULT GETDATE()
    )
  `);

  // ── MaintenanceRecords ────────────────────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'MaintenanceRecords') AND type='U')
    CREATE TABLE MaintenanceRecords (
      Id          INT IDENTITY PRIMARY KEY,
      VehicleId   INT            NOT NULL,
      VehicleName NVARCHAR(150)  DEFAULT '',
      TypeId      INT            NOT NULL,
      TypeName    NVARCHAR(100)  DEFAULT '',
      ServiceDate DATE           NOT NULL,
      KmAtService INT            NULL,
      NextDueDate DATE           NULL,
      NextDueKm   INT            NULL,
      Cost        DECIMAL(12,2)  DEFAULT 0,
      DoneBy      NVARCHAR(150)  DEFAULT '',
      Notes       NVARCHAR(500)  DEFAULT '',
      CompanyId   INT            NOT NULL,
      CreatedAt   DATETIME       DEFAULT GETDATE()
    )
  `);

  // ── Seed MaintenanceTypes (company 1) ────────────────────────────────────
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM MaintenanceTypes WHERE CompanyId=1 AND IsSystem=1)
    BEGIN
      INSERT INTO MaintenanceTypes (Name, Emoji, DefaultKmInterval, DefaultDaysInterval, IsSystem, CompanyId) VALUES
        (N'Engine Oil Change',       N'🛢️', 5000,  90,   1, 1),
        (N'Tyre Rotation/Change',    N'🔄', 10000, 180,  1, 1),
        (N'Air Filter',              N'💨', 10000, 180,  1, 1),
        (N'Battery Check/Replace',   N'🔋', NULL,  365,  1, 1),
        (N'Brake Service',           N'🔧', 15000, 180,  1, 1),
        (N'Transmission Service',    N'⚙️', 40000, 365,  1, 1),
        (N'Coolant Flush',           N'🌡️', 40000, 730,  1, 1),
        (N'Clutch Service',          N'🔩', 50000, NULL, 1, 1),
        (N'Suspension Check',        N'🚗', 20000, 180,  1, 1),
        (N'Fuel Filter',             N'⛽', 15000, 180,  1, 1)
    END
  `);

  console.log('✅ Migration complete');
}

module.exports = migrate;
