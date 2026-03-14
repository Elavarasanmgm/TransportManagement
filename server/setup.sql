-- ============================================================
-- Transport Management System - Database Setup Script
-- Run this script in SSMS on DESKTOP-ASUHSNB
-- ============================================================

-- 1. Create Database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TransportDB')
BEGIN
    CREATE DATABASE TransportDB;
    PRINT 'Database TransportDB created.';
END
GO

USE TransportDB;
GO

-- 2. Vehicles Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vehicles')
BEGIN
    CREATE TABLE Vehicles (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(100)  NOT NULL,
        Type        NVARCHAR(50)   NOT NULL,   -- Lorry, JCB, Tractor, Car
        RegNo       NVARCHAR(50)   NOT NULL UNIQUE,
        Model       NVARCHAR(100),
        Year        INT,
        Status      NVARCHAR(20)   DEFAULT 'available',  -- available, on-rent, maintenance
        Driver      NVARCHAR(100),
        DailyRate   DECIMAL(10,2)  DEFAULT 0,
        Emoji       NVARCHAR(10)   DEFAULT '🚛',
        CreatedAt   DATETIME       DEFAULT GETDATE()
    );
    PRINT 'Vehicles table created.';
END
GO

-- 3. Customers Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
BEGIN
    CREATE TABLE Customers (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        Name         NVARCHAR(150)  NOT NULL,
        Contact      NVARCHAR(100),
        Phone        NVARCHAR(20)   NOT NULL,
        Email        NVARCHAR(150),
        Address      NVARCHAR(250),
        TotalRentals INT            DEFAULT 0,
        TotalAmount  DECIMAL(12,2)  DEFAULT 0,
        Status       NVARCHAR(20)   DEFAULT 'active',
        CreatedAt    DATETIME       DEFAULT GETDATE()
    );
    PRINT 'Customers table created.';
END
GO

-- 4. Rentals Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Rentals')
BEGIN
    CREATE TABLE Rentals (
        Id           INT IDENTITY(1,1) PRIMARY KEY,
        VehicleId    INT            REFERENCES Vehicles(Id) ON DELETE SET NULL,
        VehicleName  NVARCHAR(100),
        Customer     NVARCHAR(150)  NOT NULL,
        Phone        NVARCHAR(20),
        StartDate    DATE           NOT NULL,
        EndDate      DATE           NOT NULL,
        Days         INT            DEFAULT 1,
        DailyRate    DECIMAL(10,2)  DEFAULT 0,
        TotalAmount  DECIMAL(12,2)  DEFAULT 0,
        AdvancePaid  DECIMAL(12,2)  DEFAULT 0,
        Balance      DECIMAL(12,2)  DEFAULT 0,
        Purpose      NVARCHAR(250),
        Status       NVARCHAR(20)   DEFAULT 'active',  -- active, completed, cancelled
        CreatedAt    DATETIME       DEFAULT GETDATE()
    );
    PRINT 'Rentals table created.';
END
GO

-- 5. Expenses Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Expenses')
BEGIN
    CREATE TABLE Expenses (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        VehicleId   INT            REFERENCES Vehicles(Id) ON DELETE SET NULL,
        VehicleName NVARCHAR(100),
        Category    NVARCHAR(50)   NOT NULL,  -- Fuel, Maintenance, Repair, Insurance, Tyres, Salary, Other
        Amount      DECIMAL(12,2)  NOT NULL,
        ExpenseDate DATE           NOT NULL,
        Description NVARCHAR(250),
        PaidBy      NVARCHAR(50)   DEFAULT 'Cash',
        CreatedAt   DATETIME       DEFAULT GETDATE()
    );
    PRINT 'Expenses table created.';
END
GO

-- 6. Drivers Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Drivers')
BEGIN
    CREATE TABLE Drivers (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        Name        NVARCHAR(100)  NOT NULL,
        Phone       NVARCHAR(20)   NOT NULL,
        LicenseNo   NVARCHAR(50),
        LicenseType NVARCHAR(20)   DEFAULT 'LMV',
        VehicleId   INT            REFERENCES Vehicles(Id) ON DELETE SET NULL,
        VehicleName NVARCHAR(100),
        JoinDate    DATE,
        Salary      DECIMAL(10,2)  DEFAULT 0,
        Advance     DECIMAL(10,2)  DEFAULT 0,
        Status      NVARCHAR(20)   DEFAULT 'active',
        CreatedAt   DATETIME       DEFAULT GETDATE()
    );
    PRINT 'Drivers table created.';
END
GO

-- 7. Attendance Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Attendance')
BEGIN
    CREATE TABLE Attendance (
        Id          INT IDENTITY(1,1) PRIMARY KEY,
        DriverId    INT            REFERENCES Drivers(Id) ON DELETE CASCADE,
        DriverName  NVARCHAR(100),
        AttDate     DATE           NOT NULL,
        Status      NVARCHAR(20)   DEFAULT 'present',  -- present, absent, halfday, leave
        InTime      NVARCHAR(10),
        OutTime     NVARCHAR(10),
        Overtime    DECIMAL(4,1)   DEFAULT 0,
        Notes       NVARCHAR(250),
        CreatedAt   DATETIME       DEFAULT GETDATE(),
        CONSTRAINT UQ_Attendance UNIQUE (DriverId, AttDate)
    );
    PRINT 'Attendance table created.';
END
GO

-- ============================================================
-- Seed Data
-- ============================================================

-- Vehicles
IF NOT EXISTS (SELECT 1 FROM Vehicles)
BEGIN
    INSERT INTO Vehicles (Name, Type, RegNo, Model, Year, Status, Driver, DailyRate, Emoji) VALUES
    ('Lorry - TN01AB1234',   'Lorry',   'TN01AB1234', 'Tata LPT 1613',     2019, 'available',   'Raju Kumar', 4500, '🚛'),
    ('JCB - TN02CD5678',     'JCB',     'TN02CD5678', 'JCB 3DX',           2020, 'on-rent',     'Selvam M',   6000, '🚜'),
    ('Tractor - TN03EF9012', 'Tractor', 'TN03EF9012', 'Mahindra 575 DI',   2021, 'available',   'Murugan K',  2500, '🚜'),
    ('Car - TN04GH3456',     'Car',     'TN04GH3456', 'Toyota Innova',      2022, 'maintenance', 'Arjun P',    2000, '🚗');
    PRINT 'Vehicles seeded.';
END
GO

-- Customers
IF NOT EXISTS (SELECT 1 FROM Customers)
BEGIN
    INSERT INTO Customers (Name, Contact, Phone, Email, Address, TotalRentals, TotalAmount, Status) VALUES
    ('Ram Constructions', 'Ram Kumar', '9876543210', 'ram@ramconstructions.com', 'Coimbatore, TN', 5, 95000, 'active'),
    ('Suresh Builders',   'Suresh S',  '9876501234', 'suresh@builders.com',      'Salem, TN',      3, 68000, 'active'),
    ('Padma Farms',       'Padma R',   '8765432109', '',                         'Erode, TN',      2, 20000, 'active');
    PRINT 'Customers seeded.';
END
GO

-- Rentals
IF NOT EXISTS (SELECT 1 FROM Rentals)
BEGIN
    INSERT INTO Rentals (VehicleId, VehicleName, Customer, Phone, StartDate, EndDate, Days, DailyRate, TotalAmount, AdvancePaid, Balance, Purpose, Status) VALUES
    (1, 'Lorry - TN01AB1234',   'Ram Constructions', '9876543210', '2026-03-01', '2026-03-05', 5, 4500, 22500, 10000, 12500, 'Sand transport',  'completed'),
    (2, 'JCB - TN02CD5678',     'Suresh Builders',   '9876501234', '2026-03-08', '2026-03-12', 4, 6000, 24000, 12000, 12000, 'Foundation work', 'active'),
    (3, 'Tractor - TN03EF9012', 'Padma Farms',       '8765432109', '2026-02-20', '2026-02-24', 4, 2500, 10000,  5000,  5000, 'Field ploughing', 'completed');
    PRINT 'Rentals seeded.';
END
GO

-- Expenses
IF NOT EXISTS (SELECT 1 FROM Expenses)
BEGIN
    INSERT INTO Expenses (VehicleId, VehicleName, Category, Amount, ExpenseDate, Description, PaidBy) VALUES
    (1, 'Lorry - TN01AB1234',   'Fuel',        3500,  '2026-03-02', 'Diesel fill - 50L',          'Cash'),
    (2, 'JCB - TN02CD5678',     'Maintenance', 8000,  '2026-03-01', 'Engine service',              'Account'),
    (4, 'Car - TN04GH3456',     'Repair',      5500,  '2026-03-07', 'Brake pad replacement',       'Cash'),
    (1, 'Lorry - TN01AB1234',   'Insurance',   12000, '2026-02-15', 'Annual insurance renewal',    'Account'),
    (3, 'Tractor - TN03EF9012', 'Fuel',        2000,  '2026-03-04', 'Diesel fill - 30L',           'Cash');
    PRINT 'Expenses seeded.';
END
GO

-- Drivers
IF NOT EXISTS (SELECT 1 FROM Drivers)
BEGIN
    INSERT INTO Drivers (Name, Phone, LicenseNo, LicenseType, VehicleId, VehicleName, JoinDate, Salary, Advance, Status) VALUES
    ('Raju Kumar', '9876543210', 'TN-0119960034761', 'HMV', 1, 'Lorry - TN01AB1234',   '2020-01-15', 18000, 5000, 'active'),
    ('Selvam M',   '9876501234', 'TN-0120050012345', 'HMV', 2, 'JCB - TN02CD5678',     '2021-03-10', 20000, 0,    'active'),
    ('Murugan K',  '8765432109', 'TN-0120100056789', 'LMV', 3, 'Tractor - TN03EF9012', '2019-06-20', 15000, 3000, 'active'),
    ('Arjun P',    '7654321098', 'TN-0120150067890', 'LMV', 4, 'Car - TN04GH3456',     '2022-09-01', 16000, 0,    'active');
    PRINT 'Drivers seeded.';
END
GO

-- Attendance
IF NOT EXISTS (SELECT 1 FROM Attendance)
BEGIN
    INSERT INTO Attendance (DriverId, DriverName, AttDate, Status, InTime, OutTime, Overtime, Notes) VALUES
    (1, 'Raju Kumar', '2026-03-10', 'present', '08:00', '18:00', 0, ''),
    (2, 'Selvam M',   '2026-03-10', 'present', '07:30', '19:00', 1, ''),
    (3, 'Murugan K',  '2026-03-10', 'absent',  '',      '',      0, 'Sick leave'),
    (4, 'Arjun P',    '2026-03-10', 'present', '09:00', '17:00', 0, '');
    PRINT 'Attendance seeded.';
END
GO

PRINT '✅ TransportDB setup complete!';
GO
