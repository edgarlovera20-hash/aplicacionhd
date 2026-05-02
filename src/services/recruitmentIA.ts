/**
 * Base de Datos de Información y Lógica para la IA de Reclutamiento de Heavenly Dreams
 */

export interface RecruitmentProfile {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  tone: string;
  filterQuestions: string[];
  cierreScript: string;
}

export interface CompanyInfo {
  name: string;
  sector: string;
  location: string;
  zones: string[];
  objective: string;
  channels: string[];
}

export interface RecruitmentKnowledgeBase {
  companyInfo: CompanyInfo;
  profiles: RecruitmentProfile[];
  scoringLogic: any;
  faq: any;
  prompts: any;
}

export const RECRUITMENT_KNOWLEDGE_BASE: RecruitmentKnowledgeBase = {
  companyInfo: {
    name: "Heavenly Dreams SAS de CV",
    sector: "Reclutamiento masivo (Telecomunicaciones, Ventas, Campo)",
    location: "CDMX y expansión nacional",
    zones: ["Norte", "Sur", "Oriente", "Poniente", "Centro", "Estado de México"],
    objective: "Reducir tiempo de contratación y mejorar calidad mediante IA",
    channels: ["WhatsApp Business", "Redes Sociales", "Campo", "Referidos"]
  },
  
  profiles: [
    {
      id: "volantero",
      title: "Volantero",
      description: "Reparto de publicidad y volanteo en campo.",
      requirements: ["18-45 años", "Sin experiencia necesaria", "Activo", "Disponibilidad inmediata"],
      tone: "Simple, rápido, directo",
      filterQuestions: [
        "¿Puedes caminar varias horas?",
        "¿Tienes disponibilidad inmediata para empezar esta semana?"
      ],
      cierreScript: "Perfecto, entonces sí puedes entrar. Te agendo entrevista hoy o mañana. ¿Qué día te queda mejor?"
    },
    {
      id: "ayudante",
      title: "Ayudante General",
      description: "Apoyo operativo, carga ligera y actividades físicas.",
      requirements: ["18-50 años", "Fuerza física", "Responsable"],
      tone: "Directo, práctico",
      filterQuestions: [
        "¿Has trabajado en algo similar?",
        "¿Tienes algún problema con el trabajo físico (carga y apoyo)?"
      ],
      cierreScript: "Buscamos gente que sí quiera trabajar. Aquí contratamos rápido. ¿Vienes hoy o mañana?"
    },
    {
      id: "asesor",
      title: "Asesor Comercial (Ventas Telmex)",
      description: "Venta de servicios Telmex en campo y digital.",
      requirements: ["18-35 años", "Hambre económica", "Extrovertido", "Enfoque en comisiones"],
      tone: "Persuasivo, ambicioso",
      filterQuestions: [
        "¿Te interesa ganar más dependiendo de lo que vendas (sin límite)?",
        "¿Tienes experiencia en ventas o atención al cliente?"
      ],
      cierreScript: "Te soy directo: esto no es para todos, pero el que le entra gana bien. ¿Te interesa o solo estás viendo?"
    },
    {
      id: "supervisor",
      title: "Supervisor de Personal",
      description: "Liderazgo de equipos de ventas y campo.",
      requirements: ["Experiencia liderando", "Control de equipo", "Enfoque en resultados/KPIs"],
      tone: "Profesional, orientado a resultados",
      filterQuestions: [
        "¿Cuántas personas has supervisado anteriormente?",
        "¿Has trabajado bajo metas y presión de resultados?"
      ],
      cierreScript: "Buscamos líderes reales, no supervisores pasivos. Si traes el perfil, avanzamos. ¿Te agendo?"
    },
    {
      id: "reclutador",
      title: "Reclutador Interno",
      description: "Captación de nuevos perfiles para la empresa.",
      requirements: ["Uso de redes sociales", "Comunicación efectiva", "Orientado a metas"],
      tone: "Estratégico, empático",
      filterQuestions: [
        "¿Has reclutado personal anteriormente?",
        "¿Sabes usar redes sociales para prospección?"
      ],
      cierreScript: "Aquí ganas por resultados. Si quieres aprender y generar, te agendo entrevista. ¿Te late?"
    }
  ],

  scoringLogic: {
    weights: {
      interest: 40,
      availability: 25,
      zone: 15,
      experience: 10,
      responseSpeed: 10
    },
    levels: {
      A: { range: [80, 100], action: "Cierre inmediato / Prioridad alta" },
      B: { range: [50, 79], action: "Seguimiento y empuje de decisión" },
      C: { range: [0, 49], action: "Descarte elegante o reciclaje para futuro" }
    }
  },

  faq: {
    pago: "Los ingresos son semanales. Para perfiles de ventas, es esquema de comisiones sin tope (puedes ganar lo que te propongas). Para operativos, es sueldo base más bonos de productividad. Te damos el tabulador exacto en la entrevista.",
    horarios: "Manejamos horarios operativos de lunes a sábado. El horario exacto depende de la zona asignada, pero buscamos flexibilidad para que puedas producir más.",
    experiencia: "¡No te preocupes! Para la mayoría de nuestras vacantes (Volantero, Ayudante, Asesor) nosotros te capacitamos. Lo que más nos importa es tu actitud y ganas de trabajar.",
    ubicacion: "Nuestras oficinas centrales están en la CDMX, pero tenemos puntos de encuentro y trabajo en diversas zonas de la ciudad y el área metropolitana para que te quede cerca.",
    documentos: "Para empezar, solo necesitas tu INE y disponibilidad. Si avanzas, te pediremos comprobante de domicilio y CURP para tu expediente.",
    seguridad: "Somos una empresa establecida (Heavenly Dreams SAS de CV). Todo el proceso es gratuito y profesional."
  },

  prompts: {
    systemBase: `Eres un reclutador experto de Heavenly Dreams en CDMX. Hablas como humano, natural y directo. Objetivo: Filtrar rápido y agendar entrevista.`,
    faqHandler: "Si el usuario pregunta por pago, horarios, o requisitos, responde de forma breve y redirige al cierre: 'Te explico todo a detalle en la entrevista, ¿puedes venir hoy?'",
    onboarding: "Plan de 7 días: Día 1-Capacitación técnica, Día 2-Cultura, Día 3-Ventas, Día 4-Activación en campo...",
    whatsappFlow: "Intro -> Selección Vacante -> 2 Preguntas Filtro -> Evaluación Scoring -> Cierre/Agenda"
  }
};

export class RecruitmentAIAgent {
  /**
   * Genera la respuesta del bot basada en el perfil y el mensaje del usuario
   */
  public generateStepResponse(vacancyId: string, userText: string, history: any[]): string {
    // Lógica para simular el comportamiento del agente IA basado en la base de conocimientos
    return "Respuesta simulada basada en la lógica de reclutamiento.";
  }

  /**
   * Analiza y clasifica al candidato (Scoring A/B/C)
   */
  public getCandidateScore(data: any): { score: number, level: string } {
    let score = 0;
    if (data.interest === 'alto') score += 40;
    if (data.availability === 'inmediata') score += 25;
    if (data.zone === 'cercana') score += 15;
    if (data.experience) score += 10;
    if (data.speed === 'rapida') score += 10;

    let level = 'C';
    if (score >= 80) level = 'A';
    else if (score >= 50) level = 'B';

    return { score, level };
  }
}

export const recruitmentIA = new RecruitmentAIAgent();
