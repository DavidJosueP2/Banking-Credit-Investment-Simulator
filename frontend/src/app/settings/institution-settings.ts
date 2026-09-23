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
  heroCreditButton: string
  heroInvestmentButton: string
  bannerEnabled: string
  bannerIntervalSeconds: string
  bannerGeneralTitle: string
  bannerGeneralDescription: string
  bannerGeneralImageAlt: string
  bannerGeneralButton: string
  bannerGeneralInvestmentButton: string
  bannerCreditTitle: string
  bannerCreditDescription: string
  bannerCreditImageAlt: string
  bannerCreditButton: string
  bannerInvestmentTitle: string
  bannerInvestmentDescription: string
  bannerInvestmentImageAlt: string
  bannerInvestmentButton: string
  servicesEnabled: string
  servicesTitle: string
  servicesDescription: string
  creditServiceTitle: string
  creditServiceDescription: string
  creditServiceButton: string
  creditServiceIcon: string
  amortizationServiceTitle: string
  amortizationServiceDescription: string
  amortizationServiceButton: string
  amortizationServiceIcon: string
  investmentServiceTitle: string
  investmentServiceDescription: string
  investmentServiceButton: string
  investmentServiceIcon: string
  applicationServiceTitle: string
  applicationServiceDescription: string
  applicationServiceButton: string
  applicationServiceIcon: string
  perspectiveEnabled: string
  perspectiveTitle: string
  perspectiveDescription: string
  perspectiveCreditTitle: string
  perspectiveCreditDescription: string
  perspectiveInvestmentTitle: string
  perspectiveInvestmentDescription: string
  creditTitle: string
  creditDescription: string
  creditSectionIcon: string
  creditImageAlt: string
  creditImageCaption: string
  creditBulletOne: string
  creditBulletTwo: string
  creditBulletThree: string
  creditStatusLabel: string
  investmentTitle: string
  investmentDescription: string
  investmentSectionIcon: string
  investmentDetail: string
  investmentImageAlt: string
  investmentImageCaption: string
  investmentFeatureOneTitle: string
  investmentFeatureOneDescription: string
  investmentFeatureOneIcon: string
  investmentFeatureTwoTitle: string
  investmentFeatureTwoDescription: string
  investmentFeatureTwoIcon: string
  investmentStatusLabel: string
  processEnabled: string
  processTitle: string
  processDescription: string
  processStepOneTitle: string
  processStepOneDescription: string
  processStepTwoTitle: string
  processStepTwoDescription: string
  processStepThreeTitle: string
  processStepThreeDescription: string
  closingEnabled: string
  closingTitle: string
  closingHighlight: string
  closingDescription: string
  closingBulletOne: string
  closingBulletTwo: string
  closingBulletThree: string
  closingButton: string
  headerServicesLabel: string
  headerProcessLabel: string
  footerProductsHeading: string
  footerAccessHeading: string
  footerContactHeading: string
  footerHomeLabel: string
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
  | 'carouselCreditImage'
  | 'carouselInvestmentImage'
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
    backgroundLightColor: '#f2f2f2',
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
    headingFont: 'Axiforma',
    sansFont: 'Plus Jakarta Sans',
  },
  landing: {
    heroTitle: 'Tus decisiones financieras,',
    heroHighlight: 'más claras.',
    heroDescription: 'Compara opciones de crédito e inversión, revisa sus condiciones y elige con información clara antes de decidir.',
    heroCreditButton: 'Explorar créditos',
    heroInvestmentButton: 'Conocer inversiones',
    bannerEnabled: 'true',
    bannerIntervalSeconds: '6',
    bannerGeneralTitle: 'Más formas de avanzar con {shortName}.',
    bannerGeneralDescription: '{description}',
    bannerGeneralImageAlt: 'Manos cubiertas de colores que representan distintas decisiones y proyectos personales',
    bannerGeneralButton: 'Explorar créditos',
    bannerGeneralInvestmentButton: 'Conocer inversiones',
    bannerCreditTitle: 'Créditos para comparar con tranquilidad.',
    bannerCreditDescription: 'Revisa cuotas, plazos y sistemas de amortización antes de elegir una alternativa.',
    bannerCreditImageAlt: 'Grupo de personas revisando información alrededor de una mesa',
    bannerCreditButton: 'Ver opciones de crédito',
    bannerInvestmentTitle: 'Una perspectiva clara para tus inversiones.',
    bannerInvestmentDescription: 'Proyecta escenarios y entiende las condiciones que acompañan cada decisión.',
    bannerInvestmentImageAlt: 'Persona observando una colección de obras en una galería',
    bannerInvestmentButton: 'Conocer inversiones',
    servicesEnabled: 'true',
    servicesTitle: 'Soluciones para entender cada paso.',
    servicesDescription: 'Brunexa reúne herramientas para revisar alternativas, comprender sus componentes y continuar el proceso desde un entorno digital.',
    creditServiceTitle: 'Simulador de crédito',
    creditServiceDescription: 'Compara monto, plazo y sistema de amortización en un solo recorrido.',
    creditServiceButton: 'Explorar créditos',
    creditServiceIcon: 'wallet-cards',
    amortizationServiceTitle: 'Tabla de amortización',
    amortizationServiceDescription: 'Revisa cómo se distribuyen capital, intereses y cargos en cada cuota.',
    amortizationServiceButton: 'Conocer el cálculo',
    amortizationServiceIcon: 'bar-chart',
    investmentServiceTitle: 'Proyección de inversión',
    investmentServiceDescription: 'Analiza escenarios según el monto, el plazo y las condiciones definidas.',
    investmentServiceButton: 'Explorar inversiones',
    investmentServiceIcon: 'trending-up',
    applicationServiceTitle: 'Solicitud digital',
    applicationServiceDescription: 'Continúa el proceso con documentación e identidad desde tu cuenta.',
    applicationServiceButton: 'Conocer el proceso',
    applicationServiceIcon: 'upload',
    perspectiveEnabled: 'true',
    perspectiveTitle: 'Antes de elegir, mira el panorama completo.',
    perspectiveDescription: 'La claridad está en conocer el plazo, las condiciones y lo que ocurre después de cada decisión.',
    perspectiveCreditTitle: 'Si buscas financiamiento',
    perspectiveCreditDescription: 'Compara la cuota y la composición de los pagos antes de solicitar un crédito.',
    perspectiveInvestmentTitle: 'Si quieres proyectar una meta',
    perspectiveInvestmentDescription: 'Revisa escenarios de inversión con sus plazos y condiciones.',
    creditTitle: 'Créditos que puedes comprender antes de avanzar.',
    creditDescription: 'Define el monto, el plazo y el tipo de crédito para comparar sistemas de amortización y revisar los cargos asociados.',
    creditSectionIcon: 'landmark',
    creditImageAlt: 'Asesora explicando una alternativa de crédito a una clienta',
    creditImageCaption: 'Un escenario claro comienza con condiciones bien explicadas.',
    creditBulletOne: 'Sistemas de amortización francés y alemán.',
    creditBulletTwo: 'Detalle de capital, interés, cuotas y cobros indirectos.',
    creditBulletThree: 'Tabla completa preparada para consulta y descarga.',
    creditStatusLabel: 'Simulador en preparación',
    investmentTitle: 'Inversiones pensadas para proyectar con contexto.',
    investmentDescription: 'Explora cómo cambian los resultados según el monto, el plazo y las condiciones vigentes.',
    investmentSectionIcon: 'trending-up',
    investmentDetail: 'Cuando decidas continuar, el proceso conectará tu perfil, documentos y validación de identidad.',
    investmentImageAlt: 'Cliente y asesora revisando un escenario de inversión',
    investmentImageCaption: 'Proyectar también significa entender cada condición.',
    investmentFeatureOneTitle: 'Escenarios configurables',
    investmentFeatureOneDescription: 'Compara plazos y condiciones sin perder de vista el detalle.',
    investmentFeatureOneIcon: 'sliders',
    investmentFeatureTwoTitle: 'Continuidad segura',
    investmentFeatureTwoDescription: 'La solicitud se vinculará a una cuenta identificada.',
    investmentFeatureTwoIcon: 'shield',
    investmentStatusLabel: 'Simulador de inversión disponible',
    processEnabled: 'true',
    processTitle: 'Un recorrido ordenado, desde la consulta hasta la solicitud.',
    processDescription: 'Cada etapa conserva la información necesaria para que el siguiente paso sea comprensible y verificable.',
    processStepOneTitle: 'Explora',
    processStepOneDescription: 'Selecciona el producto y completa los parámetros del escenario que quieres analizar.',
    processStepTwoTitle: 'Compara',
    processStepTwoDescription: 'Revisa resultados, composición de pagos y condiciones antes de tomar una decisión.',
    processStepThreeTitle: 'Continúa',
    processStepThreeDescription: 'Accede a tu cuenta para completar documentación y los controles de identidad requeridos.',
    closingEnabled: 'true',
    closingTitle: 'Tu espacio financiero',
    closingHighlight: 'continúa contigo.',
    closingDescription: 'En {shortName} encuentras alternativas para financiar tus proyectos, proyectar tus metas y decidir con información clara.',
    closingBulletOne: 'Créditos para impulsar tus proyectos',
    closingBulletTwo: 'Inversiones pensadas para tus metas',
    closingBulletThree: 'Información clara para decidir con calma',
    closingButton: 'Ingresar a {shortName}',
    headerServicesLabel: 'Servicios',
    headerProcessLabel: 'Cómo funciona',
    footerProductsHeading: 'Productos',
    footerAccessHeading: 'Acceso',
    footerContactHeading: 'Contacto',
    footerHomeLabel: 'Inicio',
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
    simulatorEnabled: 'true',
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
