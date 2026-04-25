import { createContext, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'transport_lang';

const translations = {
  en: {
    common: {
      appName: 'Transport',
      managementSystem: 'Management System',
      language: 'Language',
      english: 'English',
      tamil: 'Tamil',
      logout: 'Log Out',
      username: 'Username',
      password: 'Password',
      fullName: 'Full Name',
      companyName: 'Company Name',
      signIn: 'Sign In',
      registerCompany: 'Register Your Company',
      rememberMe30: 'Remember me for 30 days',
      completeSetup: 'Complete Setup',
      settingUp: 'Setting up...',
      signingIn: 'Signing in...',
      newCompanyQuestion: 'New company?',
      registerHere: 'Register here',
      removeLogo: 'Remove logo',
      logoUploadHint: 'Click to upload company logo',
      logoUploadSubHint: 'PNG / JPG / SVG · max 2 MB',
    },
    topbar: {
      dashboard: 'Dashboard',
      vehicles: 'Fleet / Vehicles',
      rentals: 'Rental Bookings',
      expenses: 'Expenses',
      profitLoss: 'Profit & Loss',
      drivers: 'Drivers',
      attendance: 'Attendance',
      customers: 'Customers',
      reports: 'Reports',
      settings: 'Settings',
      transport: 'Transport',
    },
    sidebar: {
      dashboard: 'Dashboard',
      fleet: 'Fleet',
      fleetVehicles: 'Fleet / Vehicles',
      operations: 'Operations',
      rentals: 'Rentals',
      expenses: 'Expenses',
      profitLoss: 'Profit & Loss',
      hr: 'HR',
      drivers: 'Drivers',
      attendance: 'Attendance',
      crm: 'CRM',
      customers: 'Customers',
      reportsSection: 'Reports',
      reports: 'Reports',
      system: 'System',
      settings: 'Settings',
    },
  },
  ta: {
    common: {
      appName: 'டிரான்ஸ்போர்ட்',
      managementSystem: 'மேலாண்மை அமைப்பு',
      language: 'மொழி',
      english: 'ஆங்கிலம்',
      tamil: 'தமிழ்',
      logout: 'வெளியேறு',
      username: 'பயனர் பெயர்',
      password: 'கடவுச்சொல்',
      fullName: 'முழு பெயர்',
      companyName: 'நிறுவனத்தின் பெயர்',
      signIn: 'உள்நுழை',
      registerCompany: 'உங்கள் நிறுவனத்தை பதிவு செய்யுங்கள்',
      rememberMe30: '30 நாட்களுக்கு உள்நுழைந்தே வைத்திரு',
      completeSetup: 'அமைப்பை முடி',
      settingUp: 'அமைத்து வருகிறது...',
      signingIn: 'உள்நுழைகிறது...',
      newCompanyQuestion: 'புதிய நிறுவனா?',
      registerHere: 'இங்கே பதிவு செய்யுங்கள்',
      removeLogo: 'லோகோ நீக்கு',
      logoUploadHint: 'நிறுவன லோகோவை ஏற்ற கிளிக் செய்யவும்',
      logoUploadSubHint: 'PNG / JPG / SVG · அதிகபட்சம் 2 MB',
    },
    topbar: {
      dashboard: 'டாஷ்போர்டு',
      vehicles: 'வாகனங்கள்',
      rentals: 'வாடகை பதிவுகள்',
      expenses: 'செலவுகள்',
      profitLoss: 'லாபம் & நட்டம்',
      drivers: 'ஓட்டுநர்கள்',
      attendance: 'வருகை',
      customers: 'வாடிக்கையாளர்கள்',
      reports: 'அறிக்கைகள்',
      settings: 'அமைப்புகள்',
      transport: 'டிரான்ஸ்போர்ட்',
    },
    sidebar: {
      dashboard: 'டாஷ்போர்டு',
      fleet: 'படை',
      fleetVehicles: 'படை / வாகனங்கள்',
      operations: 'செயல்பாடுகள்',
      rentals: 'வாடகை',
      expenses: 'செலவுகள்',
      profitLoss: 'லாபம் & நட்டம்',
      hr: 'மனிதவள',
      drivers: 'ஓட்டுநர்கள்',
      attendance: 'வருகை',
      crm: 'வாடிக்கையாளர்',
      customers: 'வாடிக்கையாளர்கள்',
      reportsSection: 'அறிக்கைகள்',
      reports: 'அறிக்கைகள்',
      system: 'அமைப்பு',
      settings: 'அமைப்புகள்',
    },
  },
};

const LanguageContext = createContext(null);

function getInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'ta' ? 'ta' : 'en';
}

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  function setLanguage(nextLanguage) {
    const safeLanguage = nextLanguage === 'ta' ? 'ta' : 'en';
    setLanguageState(safeLanguage);
    localStorage.setItem(STORAGE_KEY, safeLanguage);
  }

  function t(path, fallback = path) {
    return getByPath(translations[language], path)
      ?? getByPath(translations.en, path)
      ?? fallback;
  }

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    locale: language === 'ta' ? 'ta-IN' : 'en-IN',
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
