import { Language } from '../i18n/translations';

export interface PolicySection {
  id: string;
  title: string;
  badge?: string;
  paragraphs: string[];
  bullets?: string[];
  callout?: string;
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  summary: string;
  sections: PolicySection[];
}

export interface LegalPoliciesBundle {
  terms: LegalDocument;
  privacy: LegalDocument;
  rights: LegalDocument;
}

export const LEGAL_POLICIES: Record<Language, LegalPoliciesBundle> = {
  ar: {
    terms: {
      title: 'شروط واستخدام منصة برومبو (Terms of Service)',
      lastUpdated: 'تحديث: 2026',
      summary: 'تحكم هذه الشروط استخدامك لمنصة برومبو (Prombo)، بما في ذلك استعراض وتخصيص ومشاركة أوامر الذكاء الاصطناعي والمشاركة في المجتمع.',
      sections: [
        {
          id: 'acceptance',
          title: '1. قبول الشروط ونطاق الخدمة',
          badge: 'أساسي',
          paragraphs: [
            'مرحباً بك في منصة برومبو (Prombo). بمجرد دخولك إلى المنصة أو إنشاء حساب مستخدم أو استخدام أدوات استعراض وتخصيص الأوامر والمجتمع، فإنك تقر وتوافق على الالتزام الكامل بهذه الشروط.',
            'إذا كنت لا توافق على أي جزء من هذه البنود، يرجى التوقف عن استخدام المنصة فوراً.'
          ]
        },
        {
          id: 'accounts',
          title: '2. حسابات المستخدمين والتحقق الأمني',
          badge: 'الحماية',
          paragraphs: [
            'تتطلب المنصة تفعيل الحسابات عبر البريد الإلكتروني ورمز التحقق لمرة واحدة (OTP) لضمان حماية المجتمع ومنع الحسابات الوهمية أو المؤذية.',
            'أنت مسؤول بشكل كامل عن الحفاظ على سرية بيانات الدخول الخاصة بك، وعن جميع الأنشطة التي تجري عبر حسابك.'
          ],
          bullets: [
            'يجب تقديم بريد إلكتروني حقيقي وصالح للوصول إلى كافة مميزات المنصة.',
            'يمنع استخدام أي أدوات غير مصرح بها لمحاولة تجاوز تدابير التحقق الأمني أو تزوير بيانات الحساب.',
            'يحق للمنصة تجميد أو تعليق الحسابات المخالفة للسياسات أو المتورطة في أنشطة مشبوهة.'
          ]
        },
        {
          id: 'ugc',
          title: '3. المحتوى المُنشأ بواسطة المستخدمين (UGC) وحقوق الملكية',
          badge: 'الملكية الفكرية',
          paragraphs: [
            'يحتفظ المستخدم بملكية الأوامر والنصوص والتعليقات التي يقدمها لمنصة برومبو.',
            'عند نشرك لأمر أو تعليق في المنصة أو المجتمع، فإنك تمنح برومبو ترخيصاً عالمياً، غير حصري، ومجانياً لعرض ونشر وفهرسة هذا المحتوى ومشاركته مع بقية المستخدمين ضمن غايات المنصة.'
          ],
          bullets: [
            'يجب أن تمتلك الحق القانوني لمشاركة أي محتوى أو أمر برمجي تقوم بإرساله.',
            'يمنع نشر أي محتوى ينتهك حقوق الملكية الفكرية أو العلامات التجارية لطرف ثالث.',
            'تخضع المنشورات العامة لنظام الإشراف لضمان خلوها من الانتهاكات أو المحتوى المسيء.'
          ]
        },
        {
          id: 'prohibited',
          title: '4. السلوكيات والأنشطة المحظورة',
          badge: 'قواعد المجتمع',
          paragraphs: [
            'نلتزم بتوفير بيئة تقنية آمنة وخالية من الإساءة. يُحظر على أي مستخدم القيام بأي من الأفعال التالية:'
          ],
          bullets: [
            'محاولة حقن نصوص برمجية خبيثة (Prompt Injection) تهدف إلى الإضرار بالنظام أو السيرفرات.',
            'نشر أي محتوى يحث على الكراهية، العنف، التمييز، أو المواد الإباحية.',
            'الكشط الآلي (Automated Scraping) غير المصرح به لقواعد البيانات أو المحتوى.',
            'إساءة استخدام قنوات الدعم الفني المباشر أو انتحال صفة إدارة المنصة.'
          ],
          callout: 'يؤدي ارتكاب أي من المخالفات المذكورة إلى حظر الحساب فوراً واتخاذ الإجراءات التقنية اللازمة لمنع الوصول.'
        },
        {
          id: 'disclaimer',
          title: '5. إخلاء المسؤولية وضمانات نماذج الذكاء الاصطناعي',
          badge: 'إخلاء المسؤولية',
          paragraphs: [
            'يتم توفير الأوامر والنماذج على منصة برومبو "كما هي" (As-Is) دون أي ضمانات صريحة أو ضمنية لتحقيق نتائج محددة.',
            'نظراً للتحديثات المستمرة لنماذج الذكاء الاصطناعي الخارجية (مثل OpenAI, Google Gemini, Anthropic Claude, Midjourney)، فإن استجابة وتوافق الأوامر قد تختلف وفقاً لإصدارات تلك النماذج وسياساتها الخاصة.'
          ]
        }
      ]
    },
    privacy: {
      title: 'سياسة الخصوصية وحماية البيانات (Privacy Policy)',
      lastUpdated: 'تحديث: 2026',
      summary: 'نوضح هنا كيف تجمع برومبو معلوماتك الشخصية وتستخدمها وتؤمنها بما يتوافق مع المعايير العالمية (GDPR و CCPA).',
      sections: [
        {
          id: 'collection',
          title: '1. البيانات التي نقوم بجمعها',
          badge: 'جمع البيانات',
          paragraphs: [
            'نقوم بجمع الحد الأدنى من البيانات الضرورية لتشغيل المنصة وتقديم خدمة متميزة:'
          ],
          bullets: [
            'بيانات الحساب: البريد الإلكتروني، اسم المستخدم، والصورة الرمزية (Avatar).',
            'بيانات التفاعل: الأوامر المفضلة المحفوظة، التقييمات، المشاركات، وسجل نسخ الأوامر.',
            'بيانات الدعم التقني: الرسائل والمحادثات المتبادلة عبر نافذة الدعم الفني لحل المشكلات التقنية.'
          ]
        },
        {
          id: 'storage',
          title: '2. استخدام التخزين المحلي (LocalStorage) والكوكيز',
          badge: 'التخزين المحلي',
          paragraphs: [
            'نستخدم تقنية التخزين المحلي (LocalStorage) في متصفحك لأغراض تشغيلية وتفضيلات العرض فقط، ولا نستخدم أي كوكيز تتبع غير مصرح بها.'
          ],
          bullets: [
            'حفظ تفضيلات المظهر (الوضع الليلي / النهاري).',
            'حفظ خيار اللغة المفضل (العربية، الإنجليزية، الفرنسية، وغيرها).',
            'حفظ تفضيلات التنبيهات الصوتية وتفضيل تذكر البريد الإلكتروني في تسجيل الدخول.',
            'التخزين المؤقت للأوامر المفضلة لتحسين سرعة التصفح عند انقطاع الاتصال.'
          ]
        },
        {
          id: 'services',
          title: '3. الخدمات السحابية والجهات الخارجية',
          badge: 'الأطراف الخارجية',
          paragraphs: [
            'تعتمد برومبو على بنية تحتية سحابية موثوقة لحفظ البيانات وتشغيل الخدمات:'
          ],
          bullets: [
            'سوبابيز (Supabase): لتأمين تخزين قواعد البيانات المشفرة وإدارة المصادقة الآمنة.',
            'محرك الترجمة الفورية (MyMemory Translation API): لترجمة التعليقات بين اللغات عند طلب المستخدم فقط دون حفظ هوية المستخدم.',
            'شبكات الإعلانات الرقمية (عند التفعيل): لعرض إعلانات سياقية وفقاً للسياسات الإعلانية المعتمدة ودون مشاركة بياناتك الشخصية الخاصة.'
          ]
        },
        {
          id: 'security',
          title: '4. أمان وتشفير البيانات',
          badge: 'الأمان',
          paragraphs: [
            'نطبق معايير أمنية متقدمة تشمل التشفير باستخدام بروتوكولات HTTPS/TLS لجميع البيانات المتنقلة، وحماية قواعد البيانات من الوصول غير المصرح به وفق مبدأ أقل الامتيازات (Principle of Least Privilege).'
          ]
        }
      ]
    },
    rights: {
      title: 'حقوق المستخدم والامتثال القانوني (GDPR & CCPA)',
      lastUpdated: 'تحديث: 2026',
      summary: 'تضمن برومبو حقوقك الكاملة في خصوصية بياناتك والتحكم بها، بما يشمل التعديل والتصدير والحذف النهائي.',
      sections: [
        {
          id: 'user_rights',
          title: '1. حقوقك بموجب اللائحة الأوروبية العامة (GDPR)',
          badge: 'حقوقك',
          paragraphs: [
            'لكافة مستخدمينا في جميع أنحاء العالم، نمنحك السيطرة الكاملة على بياناتك الشخصية:'
          ],
          bullets: [
            'حق الوصول: يمكنك الاطلاع على كافة بياناتك الشخصية المخزنة ومشاركاتك في أي وقت.',
            'حق التصحيح: يمكنك تعديل اسمك، صورتك الرمزية، وبيانات ملفك التعريفي مباشرة من لوحة الملف الشخصي.',
            'حق النقل والتصدير: يحق لك طلب نسخة رقمية من بياناتك المسجلة عبر التواصل مع الدعم الفني.',
            'حق المسح والحذف النهائي (Right to be Forgotten): يمكنك طلب حذف حسابك وكافة بياناتك ومشاركاتك بشكل نهائي من خوادم المنصة.'
          ]
        },
        {
          id: 'deletion',
          title: '2. طلب حذف الحساب والبيانات',
          badge: 'حذف البيانات',
          paragraphs: [
            'إذا رغبت في حذف حسابك نهائياً وجميع البيانات المرتبطة به، يمكنك تقديم طلب فوري عبر مكتب الدعم الفني المباشر في المنصة أو عبر إعدادات الملف الشخصي.',
            'تتم معالجة طلبات الحذف في غضون 48 ساعة كحد أقصى، حيث يتم مسح البريد الإلكتروني، وسجل المحادثات، والبيانات الشخصية بصورة لا رجعة فيها.'
          ]
        },
        {
          id: 'contact',
          title: '3. التواصل والاستفسارات القانونية',
          badge: 'الدعم',
          paragraphs: [
            'إذا كان لديك أي استفسار أو اعتراض بخصوص سياسات الاستخدام أو معالجة البيانات، يمكنك مراسلة فريق الإشراف والدعم الفني مباشرة عبر نافذة الدعم المتوفرة داخل التطبيق.'
          ]
        }
      ]
    }
  },
  en: {
    terms: {
      title: 'Prombo Platform Terms of Service',
      lastUpdated: 'Effective: 2026',
      summary: 'These Terms govern your access to and use of Prombo, including browsing, customizing, submitting prompts, and participating in the community.',
      sections: [
        {
          id: 'acceptance',
          title: '1. Acceptance of Terms & Scope',
          badge: 'Core',
          paragraphs: [
            'Welcome to Prombo. By accessing our platform, creating a user account, or using our prompt library and community features, you agree to be bound by these Terms of Service.',
            'If you do not agree to all terms and conditions, you must discontinue using Prombo immediately.'
          ]
        },
        {
          id: 'accounts',
          title: '2. User Accounts & Verification',
          badge: 'Security',
          paragraphs: [
            'Prombo enforces strict email verification using One-Time Passcodes (OTP) to preserve community integrity and prevent unauthorized or automated abuse.',
            'You are responsible for safeguarding your credentials and for all activities conducted under your account.'
          ],
          bullets: [
            'A valid, reachable email address is required for verified platform access.',
            'Circumventing security mechanisms or falsifying identity is strictly prohibited.',
            'Prombo reserves the right to suspend or terminate accounts violating these standards.'
          ]
        },
        {
          id: 'ugc',
          title: '3. User-Generated Content (UGC) & Licensing',
          badge: 'IP Rights',
          paragraphs: [
            'You retain ownership of any prompts, templates, and comments you create and submit to Prombo.',
            'By publishing content on Prombo, you grant Prombo a worldwide, royalty-free, non-exclusive license to host, display, index, format, and distribute that content to our community.'
          ],
          bullets: [
            'You warrant that you have the right to share the prompts and materials you submit.',
            'Submissions must not infringe third-party copyrights, patents, or trade secrets.',
            'Community submissions are subject to editorial review and community safety filters.'
          ]
        },
        {
          id: 'prohibited',
          title: '4. Prohibited Conduct',
          badge: 'Conduct',
          paragraphs: [
            'To maintain a safe and productive developer environment, the following actions are strictly forbidden:'
          ],
          bullets: [
            'Adversarial prompt injection attacks targeting platform infrastructure or community members.',
            'Publishing hate speech, harassment, sexually explicit content, or dangerous instructions.',
            'Unauthorized automated scraping or denial-of-service attempts against our endpoints.',
            'Abuse of technical support channels or impersonating platform administrators.'
          ],
          callout: 'Violations will result in immediate account restriction or permanent IP/account termination.'
        },
        {
          id: 'disclaimer',
          title: '5. AI Output Disclaimer & Limitation of Liability',
          badge: 'Disclaimer',
          paragraphs: [
            'All prompts and variables on Prombo are provided "as-is" without warranties of any kind regarding specific commercial or computational outcomes.',
            'External AI foundation models (such as OpenAI, Google Gemini, Anthropic Claude, and Midjourney) evolve continuously; prompt behavior may vary across third-party model versions.'
          ]
        }
      ]
    },
    privacy: {
      title: 'Prombo Privacy Policy & Data Protection',
      lastUpdated: 'Effective: 2026',
      summary: 'Details on how Prombo collects, processes, and safeguards personal information in accordance with GDPR and CCPA standards.',
      sections: [
        {
          id: 'collection',
          title: '1. Information We Collect',
          badge: 'Collection',
          paragraphs: [
            'We collect only the minimum data required to deliver a responsive, personalized prompt engineering experience:'
          ],
          bullets: [
            'Account Information: Email address, username, chosen avatar preset.',
            'Interaction Data: Bookmarked favorites, prompt ratings, community comments, and copy timestamps.',
            'Support Data: In-app chat messages exchanged with our Technical Support team for troubleshooting.'
          ]
        },
        {
          id: 'storage',
          title: '2. LocalStorage & Browser State',
          badge: 'Local State',
          paragraphs: [
            'Prombo utilizes browser LocalStorage solely for operational preferences and client-side performance, without intrusive cross-site tracking cookies.'
          ],
          bullets: [
            'Theme preferences (Dark/Light mode).',
            'Language selection across our 7 supported locales.',
            'Audio feedback settings and Remember Me preferences.',
            'Cached favorites for high-speed offline reference.'
          ]
        },
        {
          id: 'services',
          title: '3. Cloud Services & Third Parties',
          badge: 'Integrations',
          paragraphs: [
            'We partner with reputable cloud and service providers under strict data handling agreements:'
          ],
          bullets: [
            'Supabase: Encrypted cloud database and authentication infrastructure.',
            'MyMemory Translation API: Real-time on-demand translation of community comments, processed ephemerally.',
            'Monetization Partners: When enabled, ad scripts deliver contextual promotions adhering to standard network privacy guidelines.'
          ]
        },
        {
          id: 'security',
          title: '4. Security & Encryption Standards',
          badge: 'Security',
          paragraphs: [
            'All communication with Prombo is encrypted in transit using industry-standard TLS/HTTPS protocols. Stored data is safeguarded by strict row-level security policies.'
          ]
        }
      ]
    },
    rights: {
      title: 'User Rights & Legal Compliance (GDPR / CCPA)',
      lastUpdated: 'Effective: 2026',
      summary: 'Your rights regarding data access, rectification, portability, and permanent account deletion under global privacy laws.',
      sections: [
        {
          id: 'user_rights',
          title: '1. Your Rights Under GDPR & CCPA',
          badge: 'Your Rights',
          paragraphs: [
            'Users across all jurisdictions enjoy comprehensive control over their personal data:'
          ],
          bullets: [
            'Right of Access: View all personal data and profile information linked to your account.',
            'Right to Rectification: Instantly modify your username, avatar, and settings via your Profile.',
            'Right to Portability: Request an export of your contributed prompts and interactions.',
            'Right to Erasure ("Right to be Forgotten"): Request permanent deletion of your account and related records.'
          ]
        },
        {
          id: 'deletion',
          title: '2. Account & Data Deletion Requests',
          badge: 'Erasure',
          paragraphs: [
            'You may submit an account deletion request at any time through our in-app Live Support desk or profile management settings.',
            'All personal identifiers, emails, and conversation histories are permanently purged within 48 hours.'
          ]
        },
        {
          id: 'contact',
          title: '3. Inquiries & Data Protection Contact',
          badge: 'Contact',
          paragraphs: [
            'For compliance inquiries or privacy concerns, connect directly with our compliance and technical team via the in-app Technical Support desk.'
          ]
        }
      ]
    }
  },
  fr: {
    terms: {
      title: "Conditions d'utilisation de la plateforme Prombo",
      lastUpdated: 'En vigueur: 2026',
      summary: "Ces conditions régissent votre accès et votre utilisation de Prombo, y compris la consultation, la personnalisation et le partage d'invites d'IA.",
      sections: [
        {
          id: 'acceptance',
          title: '1. Acceptation des conditions',
          badge: 'Général',
          paragraphs: [
            "Bienvenue sur Prombo. En accédant à notre plateforme, vous acceptez pleinement d'être lié par ces conditions d'utilisation.",
            "Si vous n'acceptez pas l'ensemble des conditions, veuillez cesser immédiatement d'utiliser la plateforme."
          ]
        },
        {
          id: 'accounts',
          title: '2. Comptes utilisateurs et vérification',
          badge: 'Sécurité',
          paragraphs: [
            "Prombo applique une vérification stricte par e-mail via code OTP pour protéger l'intégrité de la communauté et empêcher les abus automatisés.",
            "Vous êtes entièrement responsable de la confidentialité de vos identifiants."
          ]
        },
        {
          id: 'ugc',
          title: '3. Contenu généré par les utilisateurs (CGU)',
          badge: 'Propriété',
          paragraphs: [
            'Vous conservez tous vos droits de propriété sur les prompts que vous soumettez.',
            "En publiant du contenu sur Prombo, vous nous accordez une licence mondiale et gratuite pour afficher, indexer et partager ce contenu avec la communauté."
          ]
        },
        {
          id: 'prohibited',
          title: '4. Comportements interdits',
          badge: 'Conduite',
          paragraphs: [
            "Sont strictement interdits : l'injection de prompts malveillants, la diffusion de contenus illicites ou haineux, le scraping non autorisé et l'abus du support technique."
          ]
        }
      ]
    },
    privacy: {
      title: 'Politique de confidentialité et protection des données',
      lastUpdated: 'En vigueur: 2026',
      summary: 'Découvrez comment Prombo collecte, utilise et protège vos informations personnelles conformément au RGPD.',
      sections: [
        {
          id: 'collection',
          title: '1. Données collectées',
          badge: 'Collecte',
          paragraphs: [
            'Nous collectons uniquement les informations nécessaires au bon fonctionnement de la plateforme : adresse e-mail, pseudonyme, avatar, favoris enregistrés et messages d’assistance.'
          ]
        },
        {
          id: 'storage',
          title: '2. Stockage local (LocalStorage)',
          badge: 'Local',
          paragraphs: [
            'Le stockage local de votre navigateur est utilisé pour sauvegarder vos préférences d’affichage (mode sombre, langue, sons) sans cookies traceurs intrusifs.'
          ]
        },
        {
          id: 'security',
          title: '3. Sécurité des données',
          badge: 'Protection',
          paragraphs: [
            'Toutes les communications sont chiffrées de bout en bout via TLS/HTTPS avec des règles de sécurité strictes au niveau des bases de données.'
          ]
        }
      ]
    },
    rights: {
      title: 'Droits des utilisateurs et conformité RGPD',
      lastUpdated: 'En vigueur: 2026',
      summary: "Vos droits d'accès, de rectification et d'effacement de vos données personnelles.",
      sections: [
        {
          id: 'user_rights',
          title: '1. Vos droits (RGPD)',
          badge: 'Droits',
          paragraphs: [
            "Vous disposez d'un droit d'accès, de modification, d'exportation et de suppression définitive de vos données personnelles à tout moment."
          ],
          bullets: [
            'Droit d’accès et de consultation des données.',
            'Droit de rectification immédiate via votre profil.',
            'Droit à l’effacement (« Droit à l’oubli »).'
          ]
        },
        {
          id: 'deletion',
          title: '2. Demande de suppression',
          badge: 'Suppression',
          paragraphs: [
            'Vous pouvez demander la suppression définitive de votre compte et de toutes vos données via le support technique intégré. Les demandes sont traitées sous 48 heures.'
          ]
        }
      ]
    }
  },
  es: {
    terms: {
      title: 'Términos de servicio de la plataforma Prombo',
      lastUpdated: 'Vigente: 2026',
      summary: 'Estos términos regulan el acceso y uso de Prombo, incluida la navegación, personalización y aportación de prompts de IA.',
      sections: [
        {
          id: 'acceptance',
          title: '1. Aceptación de los términos',
          badge: 'General',
          paragraphs: [
            'Bienvenido a Prombo. Al acceder a nuestra plataforma, aceptas cumplir plenamente con estos términos y condiciones.',
            'Si no estás de acuerdo con alguna cláusula, debes suspender el uso del servicio inmediatamente.'
          ]
        },
        {
          id: 'accounts',
          title: '2. Cuentas de usuario y verificación',
          badge: 'Seguridad',
          paragraphs: [
            'Prombo requiere verificación por correo mediante código OTP para garantizar la integridad y seguridad de la comunidad.',
            'Eres responsable de proteger tus credenciales y de todas las acciones realizadas desde tu cuenta.'
          ]
        },
        {
          id: 'ugc',
          title: '3. Contenido generado por usuarios (UGC)',
          badge: 'Propiedad',
          paragraphs: [
            'Conservas la propiedad intelectual de los prompts y comentarios que aportes.',
            'Nos otorgas una licencia mundial, no exclusiva y gratuita para alojar, mostrar y compartir dicho contenido en la plataforma.'
          ]
        },
        {
          id: 'prohibited',
          title: '4. Conductas prohibidas',
          badge: 'Reglas',
          paragraphs: [
            'Queda prohibido el intento de inyecciones maliciosas de prompts, la publicación de contenido ilícito o de odio, el raspado automatizado y el abuso del soporte.'
          ]
        }
      ]
    },
    privacy: {
      title: 'Política de privacidad y protección de datos',
      lastUpdated: 'Vigente: 2026',
      summary: 'Detalles sobre cómo Prombo recopila, trata y protege tus datos personales conforme al RGPD y normativas internacionales.',
      sections: [
        {
          id: 'collection',
          title: '1. Información recopilada',
          badge: 'Datos',
          paragraphs: [
            'Solo recopilamos los datos esenciales: correo electrónico, nombre de usuario, avatar elegido, favoritos guardados y mensajes de soporte.'
          ]
        },
        {
          id: 'storage',
          title: '2. Uso de LocalStorage',
          badge: 'Almacenamiento',
          paragraphs: [
            'Utilizamos el almacenamiento local del navegador para guardar tus preferencias de tema, idioma y sonido sin rastreadores invasivos.'
          ]
        },
        {
          id: 'security',
          title: '3. Seguridad y cifrado',
          badge: 'Seguridad',
          paragraphs: [
            'Toda comunicación se transmite de forma cifrada mediante HTTPS/TLS y se aplican políticas de seguridad a nivel de base de datos.'
          ]
        }
      ]
    },
    rights: {
      title: 'Derechos del usuario y cumplimiento RGPD',
      lastUpdated: 'Vigente: 2026',
      summary: 'Tus derechos de acceso, rectificación, portabilidad y supresión definitiva de datos.',
      sections: [
        {
          id: 'user_rights',
          title: '1. Tus derechos',
          badge: 'Derechos',
          paragraphs: [
            'Tienes derecho a acceder a tus datos, modificarlos desde tu perfil, solicitar una copia y pedir su eliminación permanente.'
          ]
        },
        {
          id: 'deletion',
          title: '2. Eliminación de cuenta',
          badge: 'Eliminación',
          paragraphs: [
            'Puedes solicitar el borrado permanente de tu cuenta y datos a través del chat de soporte técnico. Se procesa en menos de 48 horas.'
          ]
        }
      ]
    }
  },
  zh: {
    terms: {
      title: 'Prombo 平台服务条款',
      lastUpdated: '生效日期：2026年',
      summary: '本条款适用于您对 Prombo 平台的访问与使用，包括浏览、定制和共享 AI 提示词以及社区互动。',
      sections: [
        {
          id: 'acceptance',
          title: '1. 条款接受与服务范围',
          badge: '基本准则',
          paragraphs: [
            '欢迎使用 Prombo。访问本平台、注册账户或使用我们的提示词工具，即表示您完全同意并遵守本服务条款。',
            '如您不同意本条款的任何部分，请立即停止使用本平台。'
          ]
        },
        {
          id: 'accounts',
          title: '2. 用户账户与安全验证',
          badge: '账户安全',
          paragraphs: [
            'Prombo 采用严格的邮箱一次性验证码 (OTP) 机制，以确保社区真实性并杜绝虚假与恶意滥用。',
            '您有责任保管好个人登录凭据，并对账户下的所有行为负责。'
          ]
        },
        {
          id: 'ugc',
          title: '3. 用户生成内容 (UGC) 与知识产权',
          badge: '知识产权',
          paragraphs: [
            '您保留所提交提示词和评论的知识产权所有权。',
            '向平台提交内容即视为授予 Prombo 全球范围内非排他、免许可费的展示、索引与分享许可。'
          ]
        },
        {
          id: 'prohibited',
          title: '4. 禁止行为与准则',
          badge: '规范',
          paragraphs: [
            '严禁进行针对平台系统的恶意提示词注入 (Prompt Injection)、发布仇恨或违规内容、非授权自动化抓取以及滥用技术客服。'
          ]
        }
      ]
    },
    privacy: {
      title: 'Prombo 隐私政策与数据保护',
      lastUpdated: '生效日期：2026年',
      summary: '说明 Prombo 如何严格按照 GDPR 与国际数据安全标准收集、处理和保护您的个人数据。',
      sections: [
        {
          id: 'collection',
          title: '1. 我们收集的信息',
          badge: '数据收集',
          paragraphs: [
            '我们仅收集运行平台所必需的最小数据：电子邮箱、用户名、头像预设、收藏夹以及技术支持交流记录。'
          ]
        },
        {
          id: 'storage',
          title: '2. 本地存储 (LocalStorage) 说明',
          badge: '本地存储',
          paragraphs: [
            '我们仅使用浏览器的本地存储来保存您的外观主题（深色/浅色）、语言偏好和声音设置，不使用任何侵入式追踪 Cookie。'
          ]
        },
        {
          id: 'security',
          title: '3. 数据安全保障',
          badge: '安全保护',
          paragraphs: [
            '所有数据通信均采用 HTTPS/TLS 加密传输，云端数据存储遵循严格的安全隔离策略。'
          ]
        }
      ]
    },
    rights: {
      title: '用户权利与合规 (GDPR / CCPA)',
      lastUpdated: '生效日期：2026年',
      summary: '您享有随时查阅、更正、导出和彻底删除个人账户数据的权利。',
      sections: [
        {
          id: 'user_rights',
          title: '1. 用户权利保障',
          badge: '合法权益',
          paragraphs: [
            '您拥有对个人数据的完全控制权：随时查看、在个人中心即时修改资料、以及申请彻底注销账户并清除所有记录。'
          ]
        },
        {
          id: 'deletion',
          title: '2. 账户与数据注销',
          badge: '数据清除',
          paragraphs: [
            '您可通过内置在线技术支持申请永久注销账户，所有关联信息将在 48 小时内彻底从服务器永久抹除。'
          ]
        }
      ]
    }
  },
  hi: {
    terms: {
      title: 'Prombo प्लेटफॉर्म सेवा की शर्तें',
      lastUpdated: 'प्रभावी: 2026',
      summary: 'ये शर्तें Prombo के आपके उपयोग को नियंत्रित करती हैं, जिसमें AI प्रॉम्प्ट ब्राउज़ करना, कस्टमाइज़ करना और साझा करना शामिल है।',
      sections: [
        {
          id: 'acceptance',
          title: '1. शर्तों की स्वीकृति',
          badge: 'मूल नियम',
          paragraphs: [
            'Prombo में आपका स्वागत है। हमारी वेबसाइट का उपयोग करके या खाता बनाकर, आप इन सेवा की शर्तों का पूरी तरह से पालन करने के लिए सहमत होते हैं।'
          ]
        },
        {
          id: 'accounts',
          title: '2. उपयोगकर्ता खाते और सत्यापन',
          badge: 'सुरक्षा',
          paragraphs: [
            'नकली खातों को रोकने के लिए Prombo ईमेल ओटीपी सत्यापन लागू करता है। आप अपने खाते की सुरक्षा के लिए स्वयं जिम्मेदार हैं।'
          ]
        },
        {
          id: 'ugc',
          title: '3. उपयोगकर्ता सामग्री और बौद्धिक संपदा',
          badge: 'अधिकार',
          paragraphs: [
            'आपके द्वारा प्रस्तुत प्रॉम्प्ट्स पर आपका पूरा स्वामित्व रहता है। आप Prombo को समुदाय में इसे प्रदर्शित करने का गैर-अनन्य लाइसेंस प्रदान करते हैं।'
          ]
        },
        {
          id: 'prohibited',
          title: '4. प्रतिबंधित आचरण',
          badge: 'नियम',
          paragraphs: [
            'सिस्टम पर मैलवेयर अटैक, नफरत फैलाने वाली सामग्री पोस्ट करना, अनधिकृत डेटा स्क्रैपिंग और सहायता डेस्क का दुरुपयोग सख्त वर्जित है।'
          ]
        }
      ]
    },
    privacy: {
      title: 'गोपनीयता नीति और डेटा सुरक्षा',
      lastUpdated: 'प्रभावी: 2026',
      summary: 'हम आपकी व्यक्तिगत जानकारी की सुरक्षा कैसे करते हैं, इसका पूर्ण विवरण।',
      sections: [
        {
          id: 'collection',
          title: '1. एकत्रित की गई जानकारी',
          badge: 'डेटा',
          paragraphs: [
            'हम केवल आवश्यक डेटा एकत्र करते हैं: ईमेल, उपयोगकर्ता नाम, अवतार, बुकमार्क और सहायता संदेश।'
          ]
        },
        {
          id: 'storage',
          title: '2. लोकल स्टोरेज का उपयोग',
          badge: 'स्टोरेज',
          paragraphs: [
            'हम थीम, भाषा और ध्वनि प्राथमिकताओं को सहेजने के लिए ब्राउज़र के लोकल स्टोरेज का उपयोग करते हैं, किसी ट्रैकिंग कुकीज़ का नहीं।'
          ]
        },
        {
          id: 'security',
          title: '3. सुरक्षा मानक',
          badge: 'सुरक्षा',
          paragraphs: [
            'सभी संचार HTTPS/TLS प्रोटोकॉल के साथ सुरक्षित रूप से एन्क्रिप्ट किए गए हैं।'
          ]
        }
      ]
    },
    rights: {
      title: 'उपयोगकर्ता अधिकार और जीडीपीआर (GDPR)',
      lastUpdated: 'प्रभावी: 2026',
      summary: 'अपने डेटा को देखने, सुधारने और पूरी तरह से हटाने का आपका अधिकार।',
      sections: [
        {
          id: 'user_rights',
          title: '1. आपके कानूनी अधिकार',
          badge: 'अधिकार',
          paragraphs: [
            'आपको अपने व्यक्तिगत डेटा तक पहुंचने, अपनी प्रोफ़ाइल को अपडेट करने और खाता हटाने का अनुरोध करने का पूरा अधिकार है।'
          ]
        },
        {
          id: 'deletion',
          title: '2. खाता हटाने का अनुरोध',
          badge: 'हटाना',
          paragraphs: [
            'आप सपोर्ट डेस्क के माध्यम से खाता हटाने का अनुरोध कर सकते हैं। डेटा 48 घंटों के भीतर स्थायी रूप से मिटा दिया जाता है।'
          ]
        }
      ]
    }
  },
  ja: {
    terms: {
      title: 'Prombo プラットフォーム利用規約',
      lastUpdated: '発効日: 2026年',
      summary: '本規約は、Prombo の利用（AI プロンプトの閲覧、カスタマイズ、投稿、コミュニティ参加）に適用されます。',
      sections: [
        {
          id: 'acceptance',
          title: '1. 規約への同意と適用範囲',
          badge: '基本条項',
          paragraphs: [
            'Prombo へようこそ。本プラットフォームにアクセスし、またはアカウントを作成することにより、本利用規約に同意したものとみなされます。',
            '本規約のいずれかの条項に同意いただけない場合は、ただちに利用を中止してください。'
          ]
        },
        {
          id: 'accounts',
          title: '2. アカウントとセキュリティ検証',
          badge: 'セキュリティ',
          paragraphs: [
            '健全なコミュニティ維持と不正防止のため、メールアドレスによるワンタイムパスコード (OTP) 検証を実施しています。',
            'ユーザーは自身の認証情報を安全に管理する責任を負います。'
          ]
        },
        {
          id: 'ugc',
          title: '3. ユーザー投稿コンテンツ (UGC) と知的財産権',
          badge: '知的財産',
          paragraphs: [
            '投稿されたプロンプトやコメントの著作権は作成者に帰属します。',
            'プラットフォームへの投稿により、Prombo に対して表示・索引・共有のための非独占的かつ無償のライセンスを許諾するものとします。'
          ]
        },
        {
          id: 'prohibited',
          title: '4. 禁止事項',
          badge: '行動規範',
          paragraphs: [
            '悪意あるプロンプトインジェクション攻撃、違法または誹謗中傷コンテンツの投稿、無許可の自動スクレイピング、サポート機能の悪用は固く禁止されています。'
          ]
        }
      ]
    },
    privacy: {
      title: 'プライバシーポリシーおよび個人情報保護方針',
      lastUpdated: '発効日: 2026年',
      summary: 'Prombo が GDPR および国際プライバシー基準に従って個人情報を収集、処理、保護する方法について説明します。',
      sections: [
        {
          id: 'collection',
          title: '1. 収集する情報',
          badge: 'データ収集',
          paragraphs: [
            'サービス提供に必要な最小限の情報（メールアドレス、ユーザー名、アバター設定、お気に入り、サポートチャット履歴）のみを収集します。'
          ]
        },
        {
          id: 'storage',
          title: '2. ローカルストレージ (LocalStorage) の使用',
          badge: 'ローカル保存',
          paragraphs: [
            'テーマ（ダーク/ライト）、言語、通知音の設定保存のためにブラウザのローカルストレージを使用します。トラッキング目的のクッキーは使用しません。'
          ]
        },
        {
          id: 'security',
          title: '3. セキュリティと暗号化',
          badge: '安全性',
          paragraphs: [
            'すべての通信は HTTPS/TLS により安全に暗号化され、厳格なデータベースアクセス制御が行われています。'
          ]
        }
      ]
    },
    rights: {
      title: 'ユーザーの権利と法的コンプライアンス (GDPR / CCPA)',
      lastUpdated: '発効日: 2026年',
      summary: '個人データの開示、訂正、削除（忘れられる権利）に関するユーザーの正当な権利。',
      sections: [
        {
          id: 'user_rights',
          title: '1. ユーザーの権利',
          badge: '権利',
          paragraphs: [
            'ユーザーは自身の個人データへのアクセス、プロフィールの即時修正、およびアカウントの完全削除を請求する権利を有します。'
          ]
        },
        {
          id: 'deletion',
          title: '2. アカウントおよびデータの削除請求',
          badge: 'データ削除',
          paragraphs: [
            'アプリ内のサポートデスクを通じていつでもアカウント削除を請求できます。請求受理後 48 時間以内に完全に消去されます。'
          ]
        }
      ]
    }
  }
};
