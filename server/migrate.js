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

  console.log('✅ Migration complete');
}

module.exports = migrate;
