import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  ClipboardCheck,
  BarChart3,
  GraduationCap,
  Users,
  UserCog,
  Shield,
  Moon,
  Sun,
  ArrowRight,
  Mail,
  Sparkles,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Search,
  Shuffle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { college, CURRENT_ACADEMIC_YEAR } from "../lib/college";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { UserRoleType } from "../lib/types";
import { PakkaPresentLogo } from "../components/PakkaPresentLogo";
import { getScopedPath } from "../lib/sessionScope";

interface PortalCard {
  title: string;
  category: "admin" | "faculty" | "student";
  badge: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  buttonLabel: string;
  role: UserRoleType;
  tone: "lime" | "gray" | "white" | "dark" | "accent";
}

export const AccessHub: React.FC = () => {
  const {
    user,
    role,
    loading: authLoading,
    loginAsRandomDemo,
    loginAsDemo,
  } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<
    "all" | "admin" | "faculty" | "student"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openWorkflow, setOpenWorkflow] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const portalCards: PortalCard[] = [
    {
      title: "Admin Portal",
      category: "admin",
      badge: "Institutional Governance",
      description:
        "Sign in to manage institutional settings and global oversight.",
      icon: Shield,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      buttonLabel: "Admin Dashboard",
      role: "admin",
      tone: "lime",
    },
    {
      title: "HOD Portal",
      category: "admin",
      badge: "Department Head",
      description: "Sign in to manage your department and review compliance.",
      icon: Building2,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
      buttonLabel: "HOD Dashboard",
      role: "hod",
      tone: "gray",
    },
    {
      title: "Teacher Portal",
      category: "faculty",
      badge: "Classroom Faculty",
      description: "Sign in to record attendance and send parent alerts.",
      icon: Users,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      buttonLabel: "Teacher Portal",
      role: "teacher",
      tone: "white",
    },
    {
      title: "Class Teacher Portal",
      category: "faculty",
      badge: "Class Coordinator",
      description: "Sign in to manage your class and student records.",
      icon: UserCog,
      iconBg: "bg-teal-500/10",
      iconColor: "text-teal-600 dark:text-teal-400",
      buttonLabel: "Coordinator Portal",
      role: "class_coordinator",
      tone: "dark",
    },
    {
      title: "Student Portal",
      category: "student",
      badge: "Learner Self-Service",
      description: "Sign in to view your attendance and academic updates.",
      icon: GraduationCap,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      buttonLabel: "Student Portal",
      role: "student",
      tone: "accent",
    },
  ];

  const handleCardClick = (card: PortalCard) => {
    navigate(`/login/${card.role}`);
  };

  const handleRandomDemoLogin = async () => {
    setLoading(true);
    const chosenRole = await loginAsRandomDemo();
    setLoading(false);
    const dest = chosenRole === "teacher" ? "/teacher/dashboard" : "/dashboard";
    navigate(dest, { replace: true });
  };

  const handleQuickDemo = async (targetRole: UserRoleType) => {
    setLoading(true);
    await loginAsDemo(targetRole);
    setLoading(false);
    const dest = targetRole === "teacher" ? "/teacher/dashboard" : "/dashboard";
    navigate(dest, { replace: true });
  };

  const filteredCards = portalCards.filter((card) => {
    const matchesCategory =
      activeCategory === "all" || card.category === activeCategory;
    const matchesSearch =
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const portalSurfaceStyles: Record<PortalCard["tone"], React.CSSProperties> =
    theme === "dark"
      ? {
          lime: { backgroundColor: "#12220f", color: "#ffffff" },
          gray: { backgroundColor: "#101a31", color: "#ffffff" },
          white: { backgroundColor: "#18181b", color: "#ffffff" },
          dark: { backgroundColor: "#191a23", color: "#ffffff" },
          accent: { backgroundColor: "#062922", color: "#ffffff" },
        }
      : {
          lime: { backgroundColor: "#b9ff66", color: "#191a23" },
          gray: { backgroundColor: "#f3f3f3", color: "#191a23" },
          white: { backgroundColor: "#ffffff", color: "#191a23" },
          dark: { backgroundColor: "#191a23", color: "#ffffff" },
          accent: { backgroundColor: "#e9ffd0", color: "#191a23" },
        };

  const capabilitySurfaceStyles: Record<string, React.CSSProperties> =
    theme === "dark"
      ? {
          light: { backgroundColor: "#101a31", color: "#ffffff" },
          lime: { backgroundColor: "#12220f", color: "#ffffff" },
          dark: { backgroundColor: "#191a23", color: "#ffffff" },
        }
      : {
          light: { backgroundColor: "#ffffff", color: "#191a23" },
          lime: { backgroundColor: "#b9ff66", color: "#191a23" },
          dark: { backgroundColor: "#191a23", color: "#ffffff" },
        };

  return (
    <div className="access-pos-page">
      {/* Positivus-inspired public navigation */}
      <header className="access-pos-nav">
        <div className="access-pos-nav__inner">
          <div className="flex min-w-0 items-center gap-3">
            <PakkaPresentLogo
              variant="horizontal"
              size="md"
              showTagline={false}
            />
            <span className="hidden border-l-2 border-foreground/25 pl-3 text-xs font-bold sm:block">
              Academic Portal Hub
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="access-pos-session">
              <CheckCircle2 className="h-4 w-4" />
              Session {CURRENT_ACADEMIC_YEAR}
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="access-pos-theme"
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span>{theme === "light" ? "Dark" : "Light"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="access-pos-main">
        {user && role && (
          <section className="access-pos-resume" aria-label="Active session">
            <div>
              <p className="section-label">Active session</p>
              <p className="mt-2 text-sm font-bold">
                Signed in as <span>{user.full_name || user.email}</span> ·{" "}
                <span className="capitalize">{role.replace("_", " ")}</span>
              </p>
            </div>
            <Button
              onClick={() => {
                const saved = getScopedPath({
                  institutionId: user.institution_id,
                  userId: user.id,
                });
                const dest =
                  saved && saved !== "/" && saved !== "/teacher/login"
                    ? saved
                    : role === "teacher"
                      ? "/teacher/dashboard"
                      : "/dashboard";
                navigate(dest, { replace: true });
              }}
            >
              Return to active page <ArrowRight className="h-4 w-4" />
            </Button>
          </section>
        )}

        <section className="access-pos-hero" aria-labelledby="access-title">
          <div className="access-pos-hero__copy">
            <p className="section-label">PakkaPresent academic operations</p>
            <h1 id="access-title">Choose the portal built for your role.</h1>
            <p>
              Move from attendance to reports, records, and parent communication
              through one secure institutional workspace.
            </p>
            <div className="access-pos-filters" aria-label="Filter portals">
              {(
                [
                  ["all", "All", 5],
                  ["admin", "Administration", 2],
                  ["faculty", "Faculty", 2],
                  ["student", "Students", 1],
                ] as const
              ).map(([category, label, count]) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  aria-pressed={activeCategory === category}
                  className={activeCategory === category ? "is-active" : ""}
                >
                  {label} <span>({count})</span>
                </button>
              ))}
            </div>
          </div>
          <div className="access-pos-hero__visual" aria-hidden="true">
            <div className="access-pos-orbit access-pos-orbit--one">
              <ClipboardCheck className="h-8 w-8" />
            </div>
            <div className="access-pos-orbit access-pos-orbit--two">
              <Users className="h-8 w-8" />
            </div>
            <div className="access-pos-orbit access-pos-orbit--three">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div className="access-pos-hero__seal">
              <ShieldCheck className="h-10 w-10" />
              <span>
                Role-based
                <br />
                academic access
              </span>
            </div>
          </div>
        </section>

        <section
          id="study-demo"
          className="access-pos-demo"
          aria-labelledby="demo-title"
        >
          <div>
            <p className="section-label">Study demo</p>
            <h2 id="demo-title">Preview any dashboard</h2>
            <p>Explore each role with safe demonstration data.</p>
          </div>
          <div className="access-pos-demo__actions">
            {(
              [
                ["admin", "Admin"],
                ["hod", "HOD"],
                ["class_coordinator", "Coordinator"],
                ["teacher", "Teacher"],
                ["student", "Student"],
              ] as const
            ).map(([demoRole, label]) => (
              <button
                key={demoRole}
                type="button"
                onClick={() => handleQuickDemo(demoRole)}
                disabled={loading}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
        {/* Positivus-inspired portal services */}
        <section
          id="portal-grid"
          className="access-pos-portals"
          aria-label="Available institutional portals"
        >
          {filteredCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={card.role}
                className={`group access-pos-card access-pos-card--${card.tone}`}
                style={portalSurfaceStyles[card.tone]}
              >
                <button
                  type="button"
                  onClick={() => handleCardClick(card)}
                  className="access-pos-card__button"
                  aria-label={`Open ${card.title}. ${card.description}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="access-pos-card__number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="access-pos-card__icon">
                      <Icon className="h-7 w-7" />
                    </span>
                  </div>
                  <div className="mt-8">
                    <Badge className="access-pos-card__badge">
                      {card.badge}
                    </Badge>
                    <h2>{card.title}</h2>
                    <p>{card.description}</p>
                  </div>
                  <div className="access-pos-card__footer">
                    <span>Enter portal</span>
                    <span className="positivus-action-circle">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              </article>
            );
          })}
        </section>
        <section
          className="mx-auto mb-10 max-w-5xl rounded-[2rem] border-2 border-foreground/50 bg-[#191a23] p-6 text-white sm:p-8"
          aria-labelledby="platform-access-title"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                Platform access
              </p>
              <h2
                id="platform-access-title"
                className="mt-3 font-display text-2xl font-black"
              >
                Platform Administration
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-white/70">
                A separate workspace for authorized PakkaPresent Super
                Administrators. Institution users cannot access platform routes.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => navigate("/platform/login")}
              className="shrink-0"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Super Admin sign in
            </Button>
          </div>
        </section>
        {/* Positivus institutional capabilities */}
        <section
          className="access-pos-capabilities"
          aria-labelledby="capabilities-title"
        >
          <div className="access-pos-section-heading">
            <div>
              <p className="section-label">Built for academic operations</p>
              <h2 id="capabilities-title">Core institutional capabilities</h2>
            </div>
            <p>
              Focused tools for accurate records, timely parent communication,
              and dependable institutional reporting.
            </p>
          </div>
          <div className="access-pos-capability-grid">
            {[
              {
                number: "01",
                title: "Smart Attendance Capture",
                description:
                  "Record period-wise lecture attendance with one-tap marking and structured Excel roster imports.",
                icon: CheckCircle2,
                tone: "light",
              },
              {
                number: "02",
                title: "Automated Parent Alerts",
                description:
                  "Dispatch timely SMS and email notices to approved parent contacts when an absence is recorded.",
                icon: Zap,
                tone: "lime",
              },
              {
                number: "03",
                title: "Academic Analytics & Reports",
                description:
                  "Track attendance, identify students below 75%, and export official academic reports.",
                icon: ShieldCheck,
                tone: "dark",
              },
            ].map((capability) => {
              const Icon = capability.icon;
              return (
                <article
                  key={capability.number}
                  className={`access-pos-capability access-pos-capability--${capability.tone}`}
                  style={capabilitySurfaceStyles[capability.tone]}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="access-pos-capability__number">
                      {capability.number}
                    </span>
                    <span className="access-pos-capability__icon">
                      <Icon className="h-7 w-7" />
                    </span>
                  </div>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Operational outcomes */}
        <section className="public-section" aria-labelledby="outcomes-title">
          <div className="public-section__heading">
            <div>
              <p className="section-label">Connected academic action</p>
              <h2 id="outcomes-title">Operational outcomes</h2>
            </div>
            <p>
              Practical improvements that connect attendance, communication,
              oversight, and institutional follow-up.
            </p>
          </div>
          <div className="public-outcomes">
            {[
              [
                "01",
                "Faster attendance capture",
                "Record period-wise attendance through structured class and subject workflows.",
              ],
              [
                "02",
                "Timely parent communication",
                "Prepare approved absence and low-attendance notices through configured communication channels.",
              ],
              [
                "03",
                "Actionable institutional reporting",
                "Review trends, identify students below the minimum threshold, and export official reports.",
              ],
            ].map(([number, title, description]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Attendance workflow */}
        <section
          className="public-section public-section--workflow"
          aria-labelledby="workflow-title"
        >
          <div className="public-section__heading">
            <div>
              <p className="section-label">A clear academic workflow</p>
              <h2 id="workflow-title">
                How attendance moves through PakkaPresent
              </h2>
            </div>
            <p>
              From academic setup to attendance capture, communication, review,
              and institutional action.
            </p>
          </div>
          <div className="public-accordion public-accordion--workflow">
            {[
              [
                "01",
                "Configure academic structure",
                "Set up departments, classes, semesters, subjects, teachers, and coordinators.",
              ],
              [
                "02",
                "Capture attendance",
                "Faculty records period-wise presence through assigned subjects and classes.",
              ],
              [
                "03",
                "Notify approved contacts",
                "Authorized absence or low-attendance messages are prepared for parent communication.",
              ],
              [
                "04",
                "Review attendance health",
                "Departments and administration monitor trends, defaulters, and academic records.",
              ],
              [
                "05",
                "Export and act",
                "Generate reports, review students below 75%, and support institutional follow-up.",
              ],
            ].map(([number, title, description], index) => {
              const expanded = openWorkflow === index;
              return (
                <article key={number} className={expanded ? "is-open" : ""}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`workflow-panel-${index}`}
                    onClick={() => setOpenWorkflow(expanded ? -1 : index)}
                  >
                    <span className="public-accordion__number">{number}</span>
                    <span className="public-accordion__title">{title}</span>
                    <span
                      className="public-accordion__toggle"
                      aria-hidden="true"
                    >
                      <span className="public-accordion__glyph">
                        {expanded ? "−" : "+"}
                      </span>
                    </span>
                  </button>
                  <div
                    id={`workflow-panel-${index}`}
                    className="public-accordion__panel"
                    hidden={!expanded}
                  >
                    <p>{description}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Governance */}
        <section
          className="public-governance"
          aria-labelledby="governance-title"
        >
          <div>
            <p className="section-label">Security & governance</p>
            <h2 id="governance-title">Academic access with clear boundaries</h2>
            <p>
              Each role works within the academic information and actions
              relevant to the assigned institutional responsibility.
            </p>
            <ul>
              <li>Role-based portal access</li>
              <li>Department-scoped management</li>
              <li>Protected student and attendance records</li>
              <li>Structured reporting and accountable workflows</li>
            </ul>
          </div>
          <div className="public-governance__visual" aria-hidden="true">
            <ShieldCheck className="h-16 w-16" />
            <span>
              <Users className="h-7 w-7" />
            </span>
            <span>
              <ClipboardCheck className="h-7 w-7" />
            </span>
            <span>
              <BarChart3 className="h-7 w-7" />
            </span>
          </div>
        </section>

        {/* Frequently asked questions */}
        <section className="public-section" aria-labelledby="faq-title">
          <div className="public-section__heading">
            <div>
              <p className="section-label">Common questions</p>
              <h2 id="faq-title">Frequently asked questions</h2>
            </div>
            <p>
              Clear answers based on the portal capabilities available in
              PakkaPresent.
            </p>
          </div>
          <div className="public-accordion public-accordion--faq">
            {[
              [
                "Who can access each portal?",
                "Access follows the role assigned by the institution: administration, department head, teacher, class coordinator, or student.",
              ],
              [
                "How does faculty attendance capture work?",
                "Teachers record period-wise attendance for assigned subjects and classes through the faculty workspace.",
              ],
              [
                "When can parent alerts be sent?",
                "Authorized users can prepare absence and low-attendance communication through the configured messaging channels.",
              ],
              [
                "How is low attendance identified?",
                "Attendance records are summarized against the institutional minimum, including the current below-75% workflow.",
              ],
              [
                "Can attendance information be exported?",
                "Authorized roles can use the available reporting and export workflows for institutional review.",
              ],
              [
                "What can students see?",
                "Students can review attendance summaries, recent records, notices, and profile information.",
              ],
            ].map(([question, answer], index) => {
              const expanded = openFaq === index;
              return (
                <article key={question} className={expanded ? "is-open" : ""}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpenFaq(expanded ? -1 : index)}
                  >
                    <span className="public-accordion__title">{question}</span>
                    <span
                      className="public-accordion__toggle"
                      aria-hidden="true"
                    >
                      <span className="public-accordion__glyph">
                        {expanded ? "−" : "+"}
                      </span>
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${index}`}
                    className="public-accordion__panel"
                    hidden={!expanded}
                  >
                    <p>{answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Final portal call to action */}
        <section className="public-final-cta" aria-labelledby="final-cta-title">
          <div>
            <p className="section-label">Continue with PakkaPresent</p>
            <h2 id="final-cta-title">
              Ready to continue? Choose your academic portal.
            </h2>
            <p>
              Sign in through the role assigned by your institution or explore a
              demonstration dashboard.
            </p>
            <div>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("portal-grid")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Choose a portal <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("study-demo")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Preview a dashboard
              </button>
            </div>
          </div>
          <div className="public-final-cta__mark" aria-hidden="true">
            <PakkaPresentLogo variant="icon" size="xl" />
          </div>
        </section>
      </main>

      {/* PakkaPresent full-width page-ending footer */}
      <footer className="access-pos-footer access-pos-footer--premium">
        <div className="access-pos-footer__inner">
          <div className="access-pos-footer__topbar">
            <PakkaPresentLogo
              variant="horizontal"
              size="md"
              showTagline={false}
              colorMode="onDark"
            />
            <nav
              className="access-pos-footer__topnav"
              aria-label="Footer portal navigation"
            >
              {portalCards.map((portal) => (
                <button
                  key={portal.role}
                  type="button"
                  onClick={() => handleCardClick(portal)}
                >
                  {portal.title.replace(" Portal", "")}
                </button>
              ))}
            </nav>
            <span className="access-pos-footer__status access-pos-footer__status--top">
              <span />
              All systems operational
            </span>
          </div>

          <div className="access-pos-footer__premium-grid">
            <section
              className="access-pos-footer__contact"
              aria-labelledby="footer-contact-title"
            >
              <h2 id="footer-contact-title">Contact & support</h2>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=pakkapresent@gmail.com"
                target="_blank"
                rel="noreferrer"
              >
                <Mail className="h-4 w-4" />
                <span>pakkapresent@gmail.com</span>
              </a>
              <p>
                Smart attendance, academic records, parent communication, and
                institutional reporting in one secure workspace.
              </p>
              <span>Academic session {CURRENT_ACADEMIC_YEAR}</span>
            </section>

            <section
              className="access-pos-footer__help"
              aria-labelledby="footer-help-title"
            >
              <div>
                <p className="access-pos-footer__eyebrow">Portal assistance</p>
                <h2 id="footer-help-title">
                  Bring PakkaPresent to your institution
                </h2>
                <p>
                  Submit your institution details for platform review. Approval
                  is required before a private onboarding invitation is issued.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  onClick={() => navigate("/institution/request-access")}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-primary px-6 text-sm font-black text-primary-foreground transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#c8ff86] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#292a32]"
                >
                  Request institution access <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&to=pakkapresent@gmail.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 px-5 text-sm font-bold text-white hover:border-primary hover:text-primary"
                >
                  Contact support
                </a>
              </div>
            </section>
          </div>

          <div className="access-pos-footer__bottom">
            <span>
              © {new Date().getFullYear()} PakkaPresent. All rights reserved.
            </span>
            <span>Institutional governance & smart attendance</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
