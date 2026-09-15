export type SettingsSection = 'institution' | 'appearance' | 'landing' | 'credit' | 'investment'

export interface InstitutionSection {
  institutionName: string
  shortName: string
  slogan: string
  description: string
  supportEmail: string
  supportPhone: string
  address: string
  legalNotice: string
}

export interface AppearanceSection {
  brandPrimaryColor: string
  brandSecondaryColor: string
  brandPrimaryDarkColor: string
  brandSecondaryDarkColor: string
  backgroundLightColor: string
  foregroundLightColor: string
  surfaceLightColor: string
  mutedLightColor: string
  mutedTextLightColor: string
  sidebarLightColor: string
  borderLightColor: string
  backgroundDarkColor: string
  foregroundDarkColor: string
  surfaceDarkColor: string
  mutedDarkColor: string
  mutedTextDarkColor: string
  sidebarDarkColor: string
  borderDarkColor: string
  headingFont: string
  sansFont: string
}

export interface LandingSection {
  heroTitle: string
  heroHighlight: string
  heroDescription: string
  servicesTitle: string
  servicesDescription: string
  creditServiceIcon: string
  amortizationServiceIcon: string
  investmentServiceIcon: string
  applicationServiceIcon: string
  creditTitle: string
  creditDescription: string
  investmentTitle: string
  investmentDescription: string
  processTitle: string
}

export interface CreditSection {
  moduleEnabled: string
  displayName: string
  simulatorEnabled: string
  frenchSystemEnabled: string
  germanSystemEnabled: string
  indirectChargesEnabled: string
  pdfReportEnabled: string
}

export interface InvestmentSection {
  moduleEnabled: string
  displayName: string
  simulatorEnabled: string
  onlineApplicationEnabled: string
  documentUploadEnabled: string
  identityValidationEnabled: string
}

export interface InstitutionSettings {
  institution: InstitutionSection
  appearance: AppearanceSection
  landing: LandingSection
  credit: CreditSection
  investment: InvestmentSection
}

export type AssetKey =
  | 'fullLogoLight'
  | 'fullLogoDark'
  | 'markLogoLight'
  | 'markLogoDark'
  | 'heroImage'
  | 'creditImage'
  | 'investmentImage'

export interface SettingsResponse {
  sections: InstitutionSettings
  assets: Partial<Record<AssetKey, string>>
}

export const defaultInstitutionSettings: InstitutionSettings = {
  institution: {
    institutionName: 'Brunexa Bank',
    shortName: 'Brunexa',
    slogan: 'Tus decisiones financieras merecen más claridad.',
    description: 'Un espacio para explorar escenarios de crédito e inversión con información organizada.',
    supportEmail: 'soporte@brunexa.com',
    supportPhone: '+593 00 000 0000',
    address: 'Ecuador',
    legalNotice: 'Brunexa Bank es una institución ficticia. Los contenidos mostrados no constituyen una oferta financiera real.',
  },
  appearance: {
    brandPrimaryColor: '#08747b',
    brandSecondaryColor: '#946928',
    brandPrimaryDarkColor: '#70d4cd',
    brandSecondaryDarkColor: '#e1bd78',
    backgroundLightColor: '#fafafa',
    foregroundLightColor: '#202527',
    surfaceLightColor: '#ffffff',
    mutedLightColor: '#f3f4f4',
    mutedTextLightColor: '#586064',
    sidebarLightColor: '#f0f2f1',
    borderLightColor: '#dadddd',
    backgroundDarkColor: '#121516',
    foregroundDarkColor: '#edf0ef',
    surfaceDarkColor: '#1c2123',
    mutedDarkColor: '#272c2e',
    mutedTextDarkColor: '#adb6b5',
    sidebarDarkColor: '#1a292b',
    borderDarkColor: '#3d4547',
    headingFont: 'Libre Baskerville',
    sansFont: 'Inter',
  },
  landing: {
    heroTitle: 'Tus decisiones financieras merecen',
    heroHighlight: 'más claridad.',
    heroDescription: 'Explora escenarios de crédito e inversión con condiciones administradas por Brunexa, información ordenada y un recorrido pensado para comparar antes de decidir.',
    servicesTitle: 'Soluciones para entender cada paso.',
    servicesDescription: 'Brunexa reúne herramientas para revisar alternativas, comprender sus componentes y continuar el proceso desde un entorno digital.',
    creditServiceIcon: 'wallet-cards',
    amortizationServiceIcon: 'bar-chart',
    investmentServiceIcon: 'trending-up',
    applicationServiceIcon: 'upload',
    creditTitle: 'Créditos que puedes comprender antes de avanzar.',
    creditDescription: 'Define el monto, el plazo y el tipo de crédito para comparar sistemas de amortización y revisar los cargos asociados.',
    investmentTitle: 'Inversiones pensadas para proyectar con contexto.',
    investmentDescription: 'Explora cómo cambian los resultados según el monto, el plazo y las condiciones vigentes.',
    processTitle: 'Un recorrido ordenado, desde la consulta hasta la solicitud.',
  },
  credit: {
    moduleEnabled: 'true',
    displayName: 'Créditos',
    simulatorEnabled: 'false',
    frenchSystemEnabled: 'true',
    germanSystemEnabled: 'true',
    indirectChargesEnabled: 'true',
    pdfReportEnabled: 'true',
  },
  investment: {
    moduleEnabled: 'true',
    displayName: 'Inversiones',
    simulatorEnabled: 'false',
    onlineApplicationEnabled: 'true',
    documentUploadEnabled: 'true',
    identityValidationEnabled: 'true',
  },
}

export function mergeSettings(response?: SettingsResponse): SettingsResponse {
  if (!response) return { sections: defaultInstitutionSettings, assets: {} }
  return {
    sections: {
      institution: { ...defaultInstitutionSettings.institution, ...response.sections?.institution },
      appearance: { ...defaultInstitutionSettings.appearance, ...response.sections?.appearance },
      landing: { ...defaultInstitutionSettings.landing, ...response.sections?.landing },
      credit: { ...defaultInstitutionSettings.credit, ...response.sections?.credit },
      investment: { ...defaultInstitutionSettings.investment, ...response.sections?.investment },
    },
    assets: response.assets ?? {},
  }
}
