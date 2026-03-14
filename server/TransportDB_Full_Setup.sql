-- ============================================================
--  Transport Management System
--  Full Database Setup Script
--  Server  : DESKTOP-ASUHSNB
--  Database: TransportDB
--  Run in  : SSMS (Execute as whole script - F5)
-- ============================================================

-- ============================================================
-- PART 1 : CREATE DATABASE
-- ============================================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TransportDB')
BEGIN
    CREATE DATABASE TransportDB;
    PRINT '✔ Database TransportDB created.';
END
ELSE
    PRINT '✔ Database TransportDB already exists.';
GO

USE TransportDB;
GO

-- ============================================================
-- PART 2 : CREATE TABLES
-- ============================================================

-- ----------------------------------------------------------
-- 2.1  Vehicles
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Vehicles')
BEGIN
    CREATE TABLE Vehicles (
        Id          INT            IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(100)  NOT NULL,
        Type        NVARCHAR(50)   NOT NULL,          -- Lorry | JCB | Tractor | Car
        RegNo       NVARCHAR(50)   NOT NULL UNIQUE,
        Model       NVARCHAR(100),
        Year        INT,
        Status      NVARCHAR(20)   NOT NULL DEFAULT 'available',  -- available | on-rent | maintenance
        Driver      NVARCHAR(100),
        DailyRate   DECIMAL(10,2)  NOT NULL DEFAULT 0,
        Emoji       NVARCHAR(10)            DEFAULT '🚛',
        CreatedAt   DATETIME               DEFAULT GETDATE()
    );
    PRINT '✔ Vehicles table created.';
END
GO

-- ----------------------------------------------------------
-- 2.2  Customers
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Customers')
BEGIN
    CREATE TABLE Customers (
        Id           INT            IDENTITY(1,1) PRIMARY KEY,
        Name         NVARCHAR(150)  NOT NULL,
        Contact      NVARCHAR(100),
        Phone        NVARCHAR(20)   NOT NULL,
        Email        NVARCHAR(150),
        Address      NVARCHAR(250),
        TotalRentals INT            NOT NULL DEFAULT 0,
        TotalAmount  DECIMAL(12,2)  NOT NULL DEFAULT 0,
        Status       NVARCHAR(20)   NOT NULL DEFAULT 'active',   -- active | inactive
        CreatedAt    DATETIME               DEFAULT GETDATE()
    );
    PRINT '✔ Customers table created.';
END
GO

-- ----------------------------------------------------------
-- 2.3  Rentals
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Rentals')
BEGIN
    CREATE TABLE Rentals (
        Id          INT            IDENTITY(1,1) PRIMARY KEY,
        VehicleId   INT            REFERENCES Vehicles(Id) ON DELETE SET NULL,
        VehicleName NVARCHAR(100),
        Customer    NVARCHAR(150)  NOT NULL,
        Phone       NVARCHAR(20),
        StartDate   DATE           NOT NULL,
        EndDate     DATE           NOT NULL,
        Days        INT            NOT NULL DEFAULT 1,
        DailyRate   DECIMAL(10,2)  NOT NULL DEFAULT 0,
        TotalAmount DECIMAL(12,2)  NOT NULL DEFAULT 0,
        AdvancePaid DECIMAL(12,2)  NOT NULL DEFAULT 0,
        Balance     DECIMAL(12,2)  NOT NULL DEFAULT 0,
        Purpose     NVARCHAR(250),
        Status      NVARCHAR(20)   NOT NULL DEFAULT 'active',    -- active | completed | cancelled
        CreatedAt   DATETIME               DEFAULT GETDATE()
    );
    PRINT '✔ Rentals table created.';
END
GO

-- ----------------------------------------------------------
-- 2.4  Expenses
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Expenses')
BEGIN
    CREATE TABLE Expenses (
        Id          INT            IDENTITY(1,1) PRIMARY KEY,
        VehicleId   INT            REFERENCES Vehicles(Id) ON DELETE SET NULL,
        VehicleName NVARCHAR(100),
        Category    NVARCHAR(50)   NOT NULL,   -- Fuel | Maintenance | Repair | Insurance | Tyres | Salary | Other
        Amount      DECIMAL(12,2)  NOT NULL,
        ExpenseDate DATE           NOT NULL,
        Description NVARCHAR(250),
        PaidBy      NVARCHAR(50)            DEFAULT 'Cash',      -- Cash | Account
        CreatedAt   DATETIME               DEFAULT GETDATE()
    );
    PRINT '✔ Expenses table created.';
END
GO

-- ----------------------------------------------------------
-- 2.5  Drivers
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Drivers')
BEGIN
    CREATE TABLE Drivers (
        Id          INT            IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(100)  NOT NULL,
        Phone       NVARCHAR(20)   NOT NULL,
        LicenseNo   NVARCHAR(50),
        LicenseType NVARCHAR(20)            DEFAULT 'LMV',       -- LMV | HMV
        VehicleId   INT            REFERENCES Vehicles(Id) ON DELETE SET NULL,
        VehicleName NVARCHAR(100),
        JoinDate    DATE,
        Salary      DECIMAL(10,2)  NOT NULL DEFAULT 0,
        Advance     DECIMAL(10,2)  NOT NULL DEFAULT 0,
        Status      NVARCHAR(20)   NOT NULL DEFAULT 'active',    -- active | inactive
        CreatedAt   DATETIME               DEFAULT GETDATE()
    );
    PRINT '✔ Drivers table created.';
END
GO

-- ----------------------------------------------------------
-- 2.6  Attendance
-- ----------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Attendance')
BEGIN
    CREATE TABLE Attendance (
        Id         INT            IDENTITY(1,1) PRIMARY KEY,
        DriverId   INT            REFERENCES Drivers(Id) ON DELETE CASCADE,
        DriverName NVARCHAR(100),
        AttDate    DATE           NOT NULL,
        Status     NVARCHAR(20)   NOT NULL DEFAULT 'present',    -- present | absent | halfday | leave
        InTime     NVARCHAR(10),
        OutTime    NVARCHAR(10),
        Overtime   DECIMAL(4,1)            DEFAULT 0,
        Notes      NVARCHAR(250),
        CreatedAt  DATETIME               DEFAULT GETDATE(),
        CONSTRAINT UQ_Attendance UNIQUE (DriverId, AttDate)
    );
    PRINT '✔ Attendance table created.';
END
GO


-- ============================================================
-- PART 3 : SEED DATA  (only if tables are empty)
-- ============================================================

IF NOT EXISTS (SELECT 1 FROM Vehicles)
BEGIN
    INSERT INTO Vehicles (Name, Type, RegNo, Model, Year, Status, Driver, DailyRate, Emoji) VALUES
    ('Lorry - TN01AB1234',   'Lorry',   'TN01AB1234', 'Tata LPT 1613',   2019, 'available',   'Raju Kumar', 4500, '🚛'),
    ('JCB - TN02CD5678',     'JCB',     'TN02CD5678', 'JCB 3DX',         2020, 'on-rent',     'Selvam M',   6000, '🚜'),
    ('Tractor - TN03EF9012', 'Tractor', 'TN03EF9012', 'Mahindra 575 DI', 2021, 'available',   'Murugan K',  2500, '🚜'),
    ('Car - TN04GH3456',     'Car',     'TN04GH3456', 'Toyota Innova',   2022, 'maintenance', 'Arjun P',    2000, '🚗');
    PRINT '✔ Vehicles seeded.';
END
GO

IF NOT EXISTS (SELECT 1 FROM Customers)
BEGIN
    INSERT INTO Customers (Name, Contact, Phone, Email, Address, TotalRentals, TotalAmount, Status) VALUES
    ('Ram Constructions', 'Ram Kumar', '9876543210', 'ram@ramconstructions.com', 'Coimbatore, TN', 5, 95000, 'active'),
    ('Suresh Builders',   'Suresh S',  '9876501234', 'suresh@builders.com',     'Salem, TN',      3, 68000, 'active'),
    ('Padma Farms',       'Padma R',   '8765432109', '',                        'Erode, TN',      2, 20000, 'active');
    PRINT '✔ Customers seeded.';
END
GO

IF NOT EXISTS (SELECT 1 FROM Rentals)
BEGIN
    INSERT INTO Rentals (VehicleId, VehicleName, Customer, Phone, StartDate, EndDate, Days, DailyRate, TotalAmount, AdvancePaid, Balance, Purpose, Status) VALUES
    (1, 'Lorry - TN01AB1234',   'Ram Constructions', '9876543210', '2026-03-01', '2026-03-05', 5, 4500, 22500, 10000, 12500, 'Sand transport',  'completed'),
    (2, 'JCB - TN02CD5678',     'Suresh Builders',   '9876501234', '2026-03-08', '2026-03-12', 4, 6000, 24000, 12000, 12000, 'Foundation work', 'active'),
    (3, 'Tractor - TN03EF9012', 'Padma Farms',       '8765432109', '2026-02-20', '2026-02-24', 4, 2500, 10000,  5000,  5000, 'Field ploughing', 'completed');
    PRINT '✔ Rentals seeded.';
END
GO

IF NOT EXISTS (SELECT 1 FROM Expenses)
BEGIN
    INSERT INTO Expenses (VehicleId, VehicleName, Category, Amount, ExpenseDate, Description, PaidBy) VALUES
    (1, 'Lorry - TN01AB1234',   'Fuel',        3500,  '2026-03-02', 'Diesel fill - 50L',       'Cash'),
    (2, 'JCB - TN02CD5678',     'Maintenance', 8000,  '2026-03-01', 'Engine service',           'Account'),
    (4, 'Car - TN04GH3456',     'Repair',      5500,  '2026-03-07', 'Brake pad replacement',   'Cash'),
    (1, 'Lorry - TN01AB1234',   'Insurance',   12000, '2026-02-15', 'Annual insurance renewal', 'Account'),
    (3, 'Tractor - TN03EF9012', 'Fuel',        2000,  '2026-03-04', 'Diesel fill - 30L',       'Cash');
    PRINT '✔ Expenses seeded.';
END
GO

IF NOT EXISTS (SELECT 1 FROM Drivers)
BEGIN
    INSERT INTO Drivers (Name, Phone, LicenseNo, LicenseType, VehicleId, VehicleName, JoinDate, Salary, Advance, Status) VALUES
    ('Raju Kumar', '9876543210', 'TN-0119960034761', 'HMV', 1, 'Lorry - TN01AB1234',   '2020-01-15', 18000, 5000, 'active'),
    ('Selvam M',   '9876501234', 'TN-0120050012345', 'HMV', 2, 'JCB - TN02CD5678',     '2021-03-10', 20000,    0, 'active'),
    ('Murugan K',  '8765432109', 'TN-0120100056789', 'LMV', 3, 'Tractor - TN03EF9012', '2019-06-20', 15000, 3000, 'active'),
    ('Arjun P',    '7654321098', 'TN-0120150067890', 'LMV', 4, 'Car - TN04GH3456',     '2022-09-01', 16000,    0, 'active');
    PRINT '✔ Drivers seeded.';
END
GO

IF NOT EXISTS (SELECT 1 FROM Attendance)
BEGIN
    INSERT INTO Attendance (DriverId, DriverName, AttDate, Status, InTime, OutTime, Overtime, Notes) VALUES
    (1, 'Raju Kumar', '2026-03-10', 'present', '08:00', '18:00', 0, ''),
    (2, 'Selvam M',   '2026-03-10', 'present', '07:30', '19:00', 1, ''),
    (3, 'Murugan K',  '2026-03-10', 'absent',  '',      '',      0, 'Sick leave'),
    (4, 'Arjun P',    '2026-03-10', 'present', '09:00', '17:00', 0, '');
    PRINT '✔ Attendance seeded.';
END
GO


-- ============================================================
-- PART 4 : STORED PROCEDURES
-- ============================================================

-- ============================================================
-- 4.1  VEHICLES
-- ============================================================

-- usp_GetAllVehicles
IF OBJECT_ID('usp_GetAllVehicles', 'P') IS NOT NULL DROP PROCEDURE usp_GetAllVehicles;
GO
CREATE PROCEDURE usp_GetAllVehicles
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Vehicles ORDER BY Id;
END
GO

-- usp_GetVehicleById
IF OBJECT_ID('usp_GetVehicleById', 'P') IS NOT NULL DROP PROCEDURE usp_GetVehicleById;
GO
CREATE PROCEDURE usp_GetVehicleById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Vehicles WHERE Id = @Id;
END
GO

-- usp_InsertVehicle
IF OBJECT_ID('usp_InsertVehicle', 'P') IS NOT NULL DROP PROCEDURE usp_InsertVehicle;
GO
CREATE PROCEDURE usp_InsertVehicle
    @Name       NVARCHAR(100),
    @Type       NVARCHAR(50),
    @RegNo      NVARCHAR(50),
    @Model      NVARCHAR(100),
    @Year       INT,
    @Status     NVARCHAR(20),
    @Driver     NVARCHAR(100),
    @DailyRate  DECIMAL(10,2),
    @Emoji      NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Vehicles (Name, Type, RegNo, Model, Year, Status, Driver, DailyRate, Emoji)
    OUTPUT INSERTED.*
    VALUES (@Name, @Type, @RegNo, @Model, @Year, @Status, @Driver, @DailyRate, @Emoji);
END
GO

-- usp_UpdateVehicle
IF OBJECT_ID('usp_UpdateVehicle', 'P') IS NOT NULL DROP PROCEDURE usp_UpdateVehicle;
GO
CREATE PROCEDURE usp_UpdateVehicle
    @Id         INT,
    @Name       NVARCHAR(100),
    @Type       NVARCHAR(50),
    @RegNo      NVARCHAR(50),
    @Model      NVARCHAR(100),
    @Year       INT,
    @Status     NVARCHAR(20),
    @Driver     NVARCHAR(100),
    @DailyRate  DECIMAL(10,2),
    @Emoji      NVARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Vehicles
    SET  Name=@Name, Type=@Type, RegNo=@RegNo, Model=@Model, Year=@Year,
         Status=@Status, Driver=@Driver, DailyRate=@DailyRate, Emoji=@Emoji
    OUTPUT INSERTED.*
    WHERE Id = @Id;
END
GO

-- usp_DeleteVehicle
IF OBJECT_ID('usp_DeleteVehicle', 'P') IS NOT NULL DROP PROCEDURE usp_DeleteVehicle;
GO
CREATE PROCEDURE usp_DeleteVehicle
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Vehicles WHERE Id = @Id;
    SELECT @@ROWCOUNT AS RowsDeleted;
END
GO


-- ============================================================
-- 4.2  CUSTOMERS
-- ============================================================

IF OBJECT_ID('usp_GetAllCustomers', 'P') IS NOT NULL DROP PROCEDURE usp_GetAllCustomers;
GO
CREATE PROCEDURE usp_GetAllCustomers
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Customers ORDER BY Id;
END
GO

IF OBJECT_ID('usp_InsertCustomer', 'P') IS NOT NULL DROP PROCEDURE usp_InsertCustomer;
GO
CREATE PROCEDURE usp_InsertCustomer
    @Name         NVARCHAR(150),
    @Contact      NVARCHAR(100),
    @Phone        NVARCHAR(20),
    @Email        NVARCHAR(150),
    @Address      NVARCHAR(250),
    @TotalRentals INT,
    @TotalAmount  DECIMAL(12,2),
    @Status       NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Customers (Name, Contact, Phone, Email, Address, TotalRentals, TotalAmount, Status)
    OUTPUT INSERTED.*
    VALUES (@Name, @Contact, @Phone, @Email, @Address, @TotalRentals, @TotalAmount, @Status);
END
GO

IF OBJECT_ID('usp_UpdateCustomer', 'P') IS NOT NULL DROP PROCEDURE usp_UpdateCustomer;
GO
CREATE PROCEDURE usp_UpdateCustomer
    @Id           INT,
    @Name         NVARCHAR(150),
    @Contact      NVARCHAR(100),
    @Phone        NVARCHAR(20),
    @Email        NVARCHAR(150),
    @Address      NVARCHAR(250),
    @TotalRentals INT,
    @TotalAmount  DECIMAL(12,2),
    @Status       NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Customers
    SET  Name=@Name, Contact=@Contact, Phone=@Phone, Email=@Email, Address=@Address,
         TotalRentals=@TotalRentals, TotalAmount=@TotalAmount, Status=@Status
    OUTPUT INSERTED.*
    WHERE Id = @Id;
END
GO

IF OBJECT_ID('usp_DeleteCustomer', 'P') IS NOT NULL DROP PROCEDURE usp_DeleteCustomer;
GO
CREATE PROCEDURE usp_DeleteCustomer
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Customers WHERE Id = @Id;
    SELECT @@ROWCOUNT AS RowsDeleted;
END
GO


-- ============================================================
-- 4.3  RENTALS
-- ============================================================

IF OBJECT_ID('usp_GetAllRentals', 'P') IS NOT NULL DROP PROCEDURE usp_GetAllRentals;
GO
CREATE PROCEDURE usp_GetAllRentals
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Rentals ORDER BY Id;
END
GO

IF OBJECT_ID('usp_InsertRental', 'P') IS NOT NULL DROP PROCEDURE usp_InsertRental;
GO
CREATE PROCEDURE usp_InsertRental
    @VehicleId   INT,
    @VehicleName NVARCHAR(100),
    @Customer    NVARCHAR(150),
    @Phone       NVARCHAR(20),
    @StartDate   DATE,
    @EndDate     DATE,
    @Days        INT,
    @DailyRate   DECIMAL(10,2),
    @TotalAmount DECIMAL(12,2),
    @AdvancePaid DECIMAL(12,2),
    @Balance     DECIMAL(12,2),
    @Purpose     NVARCHAR(250),
    @Status      NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Rentals (VehicleId, VehicleName, Customer, Phone, StartDate, EndDate, Days,
                         DailyRate, TotalAmount, AdvancePaid, Balance, Purpose, Status)
    OUTPUT INSERTED.*
    VALUES (@VehicleId, @VehicleName, @Customer, @Phone, @StartDate, @EndDate, @Days,
            @DailyRate, @TotalAmount, @AdvancePaid, @Balance, @Purpose, @Status);
END
GO

IF OBJECT_ID('usp_UpdateRental', 'P') IS NOT NULL DROP PROCEDURE usp_UpdateRental;
GO
CREATE PROCEDURE usp_UpdateRental
    @Id          INT,
    @VehicleId   INT,
    @VehicleName NVARCHAR(100),
    @Customer    NVARCHAR(150),
    @Phone       NVARCHAR(20),
    @StartDate   DATE,
    @EndDate     DATE,
    @Days        INT,
    @DailyRate   DECIMAL(10,2),
    @TotalAmount DECIMAL(12,2),
    @AdvancePaid DECIMAL(12,2),
    @Balance     DECIMAL(12,2),
    @Purpose     NVARCHAR(250),
    @Status      NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Rentals
    SET  VehicleId=@VehicleId, VehicleName=@VehicleName, Customer=@Customer, Phone=@Phone,
         StartDate=@StartDate, EndDate=@EndDate, Days=@Days, DailyRate=@DailyRate,
         TotalAmount=@TotalAmount, AdvancePaid=@AdvancePaid, Balance=@Balance,
         Purpose=@Purpose, Status=@Status
    OUTPUT INSERTED.*
    WHERE Id = @Id;
END
GO

IF OBJECT_ID('usp_DeleteRental', 'P') IS NOT NULL DROP PROCEDURE usp_DeleteRental;
GO
CREATE PROCEDURE usp_DeleteRental
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Rentals WHERE Id = @Id;
    SELECT @@ROWCOUNT AS RowsDeleted;
END
GO


-- ============================================================
-- 4.4  EXPENSES
-- ============================================================

IF OBJECT_ID('usp_GetAllExpenses', 'P') IS NOT NULL DROP PROCEDURE usp_GetAllExpenses;
GO
CREATE PROCEDURE usp_GetAllExpenses
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Expenses ORDER BY ExpenseDate DESC;
END
GO

IF OBJECT_ID('usp_GetExpensesByVehicle', 'P') IS NOT NULL DROP PROCEDURE usp_GetExpensesByVehicle;
GO
CREATE PROCEDURE usp_GetExpensesByVehicle
    @VehicleId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Expenses WHERE VehicleId = @VehicleId ORDER BY ExpenseDate DESC;
END
GO

IF OBJECT_ID('usp_InsertExpense', 'P') IS NOT NULL DROP PROCEDURE usp_InsertExpense;
GO
CREATE PROCEDURE usp_InsertExpense
    @VehicleId   INT,
    @VehicleName NVARCHAR(100),
    @Category    NVARCHAR(50),
    @Amount      DECIMAL(12,2),
    @ExpenseDate DATE,
    @Description NVARCHAR(250),
    @PaidBy      NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Expenses (VehicleId, VehicleName, Category, Amount, ExpenseDate, Description, PaidBy)
    OUTPUT INSERTED.*
    VALUES (@VehicleId, @VehicleName, @Category, @Amount, @ExpenseDate, @Description, @PaidBy);
END
GO

IF OBJECT_ID('usp_UpdateExpense', 'P') IS NOT NULL DROP PROCEDURE usp_UpdateExpense;
GO
CREATE PROCEDURE usp_UpdateExpense
    @Id          INT,
    @VehicleId   INT,
    @VehicleName NVARCHAR(100),
    @Category    NVARCHAR(50),
    @Amount      DECIMAL(12,2),
    @ExpenseDate DATE,
    @Description NVARCHAR(250),
    @PaidBy      NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Expenses
    SET  VehicleId=@VehicleId, VehicleName=@VehicleName, Category=@Category,
         Amount=@Amount, ExpenseDate=@ExpenseDate, Description=@Description, PaidBy=@PaidBy
    OUTPUT INSERTED.*
    WHERE Id = @Id;
END
GO

IF OBJECT_ID('usp_DeleteExpense', 'P') IS NOT NULL DROP PROCEDURE usp_DeleteExpense;
GO
CREATE PROCEDURE usp_DeleteExpense
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Expenses WHERE Id = @Id;
    SELECT @@ROWCOUNT AS RowsDeleted;
END
GO


-- ============================================================
-- 4.5  DRIVERS
-- ============================================================

IF OBJECT_ID('usp_GetAllDrivers', 'P') IS NOT NULL DROP PROCEDURE usp_GetAllDrivers;
GO
CREATE PROCEDURE usp_GetAllDrivers
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Drivers ORDER BY Id;
END
GO

IF OBJECT_ID('usp_InsertDriver', 'P') IS NOT NULL DROP PROCEDURE usp_InsertDriver;
GO
CREATE PROCEDURE usp_InsertDriver
    @Name        NVARCHAR(100),
    @Phone       NVARCHAR(20),
    @LicenseNo   NVARCHAR(50),
    @LicenseType NVARCHAR(20),
    @VehicleId   INT,
    @VehicleName NVARCHAR(100),
    @JoinDate    DATE,
    @Salary      DECIMAL(10,2),
    @Advance     DECIMAL(10,2),
    @Status      NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Drivers (Name, Phone, LicenseNo, LicenseType, VehicleId, VehicleName,
                         JoinDate, Salary, Advance, Status)
    OUTPUT INSERTED.*
    VALUES (@Name, @Phone, @LicenseNo, @LicenseType, @VehicleId, @VehicleName,
            @JoinDate, @Salary, @Advance, @Status);
END
GO

IF OBJECT_ID('usp_UpdateDriver', 'P') IS NOT NULL DROP PROCEDURE usp_UpdateDriver;
GO
CREATE PROCEDURE usp_UpdateDriver
    @Id          INT,
    @Name        NVARCHAR(100),
    @Phone       NVARCHAR(20),
    @LicenseNo   NVARCHAR(50),
    @LicenseType NVARCHAR(20),
    @VehicleId   INT,
    @VehicleName NVARCHAR(100),
    @JoinDate    DATE,
    @Salary      DECIMAL(10,2),
    @Advance     DECIMAL(10,2),
    @Status      NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Drivers
    SET  Name=@Name, Phone=@Phone, LicenseNo=@LicenseNo, LicenseType=@LicenseType,
         VehicleId=@VehicleId, VehicleName=@VehicleName, JoinDate=@JoinDate,
         Salary=@Salary, Advance=@Advance, Status=@Status
    OUTPUT INSERTED.*
    WHERE Id = @Id;
END
GO

IF OBJECT_ID('usp_DeleteDriver', 'P') IS NOT NULL DROP PROCEDURE usp_DeleteDriver;
GO
CREATE PROCEDURE usp_DeleteDriver
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Drivers WHERE Id = @Id;
    SELECT @@ROWCOUNT AS RowsDeleted;
END
GO


-- ============================================================
-- 4.6  ATTENDANCE
-- ============================================================

IF OBJECT_ID('usp_GetAllAttendance', 'P') IS NOT NULL DROP PROCEDURE usp_GetAllAttendance;
GO
CREATE PROCEDURE usp_GetAllAttendance
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Attendance ORDER BY AttDate DESC, DriverId;
END
GO

IF OBJECT_ID('usp_GetAttendanceByDate', 'P') IS NOT NULL DROP PROCEDURE usp_GetAttendanceByDate;
GO
CREATE PROCEDURE usp_GetAttendanceByDate
    @AttDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Attendance WHERE AttDate = @AttDate ORDER BY DriverId;
END
GO

IF OBJECT_ID('usp_InsertAttendance', 'P') IS NOT NULL DROP PROCEDURE usp_InsertAttendance;
GO
CREATE PROCEDURE usp_InsertAttendance
    @DriverId   INT,
    @DriverName NVARCHAR(100),
    @AttDate    DATE,
    @Status     NVARCHAR(20),
    @InTime     NVARCHAR(10),
    @OutTime    NVARCHAR(10),
    @Overtime   DECIMAL(4,1),
    @Notes      NVARCHAR(250)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Attendance (DriverId, DriverName, AttDate, Status, InTime, OutTime, Overtime, Notes)
    OUTPUT INSERTED.*
    VALUES (@DriverId, @DriverName, @AttDate, @Status, @InTime, @OutTime, @Overtime, @Notes);
END
GO

IF OBJECT_ID('usp_UpdateAttendance', 'P') IS NOT NULL DROP PROCEDURE usp_UpdateAttendance;
GO
CREATE PROCEDURE usp_UpdateAttendance
    @Id         INT,
    @DriverId   INT,
    @DriverName NVARCHAR(100),
    @AttDate    DATE,
    @Status     NVARCHAR(20),
    @InTime     NVARCHAR(10),
    @OutTime    NVARCHAR(10),
    @Overtime   DECIMAL(4,1),
    @Notes      NVARCHAR(250)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Attendance
    SET  DriverId=@DriverId, DriverName=@DriverName, AttDate=@AttDate, Status=@Status,
         InTime=@InTime, OutTime=@OutTime, Overtime=@Overtime, Notes=@Notes
    OUTPUT INSERTED.*
    WHERE Id = @Id;
END
GO

IF OBJECT_ID('usp_DeleteAttendance', 'P') IS NOT NULL DROP PROCEDURE usp_DeleteAttendance;
GO
CREATE PROCEDURE usp_DeleteAttendance
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Attendance WHERE Id = @Id;
    SELECT @@ROWCOUNT AS RowsDeleted;
END
GO


-- ============================================================
-- 4.7  DASHBOARD / REPORTS
-- ============================================================

-- Summary Statistics (used by Dashboard page)
IF OBJECT_ID('usp_GetDashboardSummary', 'P') IS NOT NULL DROP PROCEDURE usp_GetDashboardSummary;
GO
CREATE PROCEDURE usp_GetDashboardSummary
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        (SELECT COUNT(*)                    FROM Vehicles)                         AS TotalVehicles,
        (SELECT COUNT(*)                    FROM Vehicles WHERE Status='available') AS AvailableVehicles,
        (SELECT COUNT(*)                    FROM Vehicles WHERE Status='on-rent')   AS OnRentVehicles,
        (SELECT COUNT(*)                    FROM Vehicles WHERE Status='maintenance') AS InMaintenanceVehicles,
        (SELECT COUNT(*)                    FROM Rentals)                          AS TotalRentals,
        (SELECT COUNT(*)                    FROM Rentals  WHERE Status='active')   AS ActiveRentals,
        (SELECT ISNULL(SUM(TotalAmount),0)  FROM Rentals)                          AS TotalRevenue,
        (SELECT ISNULL(SUM(Amount),0)       FROM Expenses)                         AS TotalExpenses,
        (SELECT ISNULL(SUM(TotalAmount),0) - ISNULL(SUM(Amount),0)
         FROM (SELECT TotalAmount FROM Rentals UNION ALL SELECT -Amount FROM Expenses) X(TotalAmount)
        )                                                                           AS NetProfit,
        (SELECT COUNT(*)                    FROM Drivers)                          AS TotalDrivers,
        (SELECT COUNT(*)                    FROM Customers)                        AS TotalCustomers;
END
GO

-- Monthly Profit & Loss Report
IF OBJECT_ID('usp_GetMonthlyProfitLoss', 'P') IS NOT NULL DROP PROCEDURE usp_GetMonthlyProfitLoss;
GO
CREATE PROCEDURE usp_GetMonthlyProfitLoss
    @Year  INT = NULL   -- Pass NULL to get all years; pass e.g. 2026 to filter
AS
BEGIN
    SET NOCOUNT ON;

    WITH MonthlyRevenue AS (
        SELECT
            YEAR(StartDate)  AS Yr,
            MONTH(StartDate) AS Mo,
            SUM(TotalAmount) AS Revenue
        FROM Rentals
        WHERE (@Year IS NULL OR YEAR(StartDate) = @Year)
        GROUP BY YEAR(StartDate), MONTH(StartDate)
    ),
    MonthlyExpenses AS (
        SELECT
            YEAR(ExpenseDate)  AS Yr,
            MONTH(ExpenseDate) AS Mo,
            SUM(Amount)        AS Expenses
        FROM Expenses
        WHERE (@Year IS NULL OR YEAR(ExpenseDate) = @Year)
        GROUP BY YEAR(ExpenseDate), MONTH(ExpenseDate)
    )
    SELECT
        COALESCE(r.Yr, e.Yr)                       AS Year,
        COALESCE(r.Mo, e.Mo)                       AS Month,
        FORMAT(DATEFROMPARTS(COALESCE(r.Yr,e.Yr), COALESCE(r.Mo,e.Mo), 1), 'MMM yyyy') AS MonthLabel,
        ISNULL(r.Revenue, 0)                       AS Revenue,
        ISNULL(e.Expenses, 0)                      AS Expenses,
        ISNULL(r.Revenue, 0) - ISNULL(e.Expenses, 0) AS Profit
    FROM MonthlyRevenue  r
    FULL OUTER JOIN MonthlyExpenses e ON r.Yr = e.Yr AND r.Mo = e.Mo
    ORDER BY COALESCE(r.Yr,e.Yr), COALESCE(r.Mo,e.Mo);
END
GO

-- Expense breakdown by category
IF OBJECT_ID('usp_GetExpensesByCategory', 'P') IS NOT NULL DROP PROCEDURE usp_GetExpensesByCategory;
GO
CREATE PROCEDURE usp_GetExpensesByCategory
    @FromDate DATE = NULL,
    @ToDate   DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        Category,
        COUNT(*)        AS TotalRecords,
        SUM(Amount)     AS TotalAmount
    FROM Expenses
    WHERE (@FromDate IS NULL OR ExpenseDate >= @FromDate)
      AND (@ToDate   IS NULL OR ExpenseDate <= @ToDate)
    GROUP BY Category
    ORDER BY TotalAmount DESC;
END
GO

-- Driver attendance summary for a date range
IF OBJECT_ID('usp_GetDriverAttendanceSummary', 'P') IS NOT NULL DROP PROCEDURE usp_GetDriverAttendanceSummary;
GO
CREATE PROCEDURE usp_GetDriverAttendanceSummary
    @FromDate DATE = NULL,
    @ToDate   DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        d.Id             AS DriverId,
        d.Name           AS DriverName,
        COUNT(a.Id)                                                AS TotalDays,
        SUM(CASE WHEN a.Status = 'present'  THEN 1 ELSE 0 END)    AS PresentDays,
        SUM(CASE WHEN a.Status = 'absent'   THEN 1 ELSE 0 END)    AS AbsentDays,
        SUM(CASE WHEN a.Status = 'halfday'  THEN 1 ELSE 0 END)    AS HalfDays,
        SUM(CASE WHEN a.Status = 'leave'    THEN 1 ELSE 0 END)    AS LeaveDays,
        ISNULL(SUM(a.Overtime), 0)                                 AS TotalOvertime
    FROM Drivers d
    LEFT JOIN Attendance a ON a.DriverId = d.Id
        AND (@FromDate IS NULL OR a.AttDate >= @FromDate)
        AND (@ToDate   IS NULL OR a.AttDate <= @ToDate)
    GROUP BY d.Id, d.Name
    ORDER BY d.Name;
END
GO

-- Vehicle utilisation report
IF OBJECT_ID('usp_GetVehicleUtilisation', 'P') IS NOT NULL DROP PROCEDURE usp_GetVehicleUtilisation;
GO
CREATE PROCEDURE usp_GetVehicleUtilisation
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        v.Id,
        v.Name,
        v.Type,
        v.Status,
        COUNT(r.Id)                  AS TotalRentals,
        ISNULL(SUM(r.Days),0)        AS TotalRentedDays,
        ISNULL(SUM(r.TotalAmount),0) AS TotalRevenue,
        ISNULL(SUM(e.Amount),0)      AS TotalExpenses,
        ISNULL(SUM(r.TotalAmount),0) - ISNULL(SUM(e.Amount),0) AS NetProfit
    FROM Vehicles v
    LEFT JOIN Rentals  r ON r.VehicleId = v.Id
    LEFT JOIN Expenses e ON e.VehicleId = v.Id
    GROUP BY v.Id, v.Name, v.Type, v.Status
    ORDER BY TotalRevenue DESC;
END
GO


-- ============================================================
-- DONE
-- ============================================================
PRINT '';
PRINT '=======================================================';
PRINT '✅  TransportDB setup complete!';
PRINT '    Tables  : Vehicles, Customers, Rentals, Expenses,';
PRINT '              Drivers, Attendance';
PRINT '    Procs   : 25 stored procedures created';
PRINT '    Seed    : Sample data inserted';
PRINT '=======================================================';
GO
