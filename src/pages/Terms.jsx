// src/pages/Terms.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const SECTIONS = [
  ["intro", "1. Definitions & Overview"],
  ["eligibility", "2. Eligibility & Accounts"],
  ["listings", "3. Listings & Showrooms"],
  ["pricing", "4. Pricing, Fees & Taxes"],
  ["booking", "5. Bookings & Cancellations"],
  ["payments", "6. Payments & Payouts"],
  ["insurance", "7. Insurance, Damage & Safety"],
  ["conduct", "8. Prohibited Conduct"],
  ["ratings", "9. Ratings & Reviews"],
  ["content", "10. Content & IP"],
  ["privacy", "11. Privacy & Data"],
  ["uptime", "12. Availability & Changes"],
  ["liability", "13. Liability & Indemnity"],
  ["termination", "14. Suspension & Termination"],
  ["disputes", "15. Dispute Resolution & Law"],
  ["changes", "16. Changes to Terms"],
  ["contact", "17. Contact"],
  ["faq", "FAQ — Hosting Your Car Showroom"],
  ["accept", "Accept & Register"],
];

export default function Terms() {
  const [openFaq, setOpenFaq] = useState(null);
  const [agree, setAgree] = useState(false);
  const [previouslyAcceptedAt, setPreviouslyAcceptedAt] = useState(null);
  const [activeId, setActiveId] = useState(null); // nothing shown until click
  const navigate = useNavigate();

  const lastUpdated = "2025-10-11";
  const VERSION_KEY = "scai_terms_version";
  const ACCEPTED_AT_KEY = "scai_terms_accepted_at";

  useEffect(() => {
    document.title = "Terms & Conditions • SmartCar AI";
  }, []);

  // open from hash (optional)
  useEffect(() => {
    const fromHash = window.location.hash?.replace("#", "");
    if (fromHash && SECTIONS.some(([id]) => id === fromHash)) {
      setActiveId(fromHash);
    }
  }, []);

  // prior acceptance
  useEffect(() => {
    const v = localStorage.getItem(VERSION_KEY);
    const at = localStorage.getItem(ACCEPTED_AT_KEY);
    setPreviouslyAcceptedAt(v === lastUpdated && at ? at : null);
  }, [lastUpdated]);

  function handleContinue() {
    if (!agree) return;
    const now = new Date().toISOString();
    localStorage.setItem(VERSION_KEY, lastUpdated);
    localStorage.setItem(ACCEPTED_AT_KEY, now);
    navigate("/host/register");
  }

  function toggleSection(id) {
    const next = activeId === id ? null : id;
    setActiveId(next);
    if (next) window.history.replaceState(null, "", `#${next}`);
    else window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setOpenFaq(null);
    requestAnimationFrame(() => {
      document.getElementById("content-root")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="bg-white text-slate-900">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            background:
              "radial-gradient(900px 300px at 15% 0%, rgba(14,165,233,.15), transparent 60%), radial-gradient(700px 260px at 100% 10%, rgba(99,102,241,.12), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 pt-14 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Terms &amp; Conditions</h1>
          <p className="mt-2 text-slate-600">
            Please read these terms carefully before using SmartCar AI (“Platform”) or listing your
            car showroom. By accessing or using the Platform, you agree to be bound by these terms.
          </p>
          <p className="mt-1 text-xs text-slate-500">Last updated: {lastUpdated}</p>
          {previouslyAcceptedAt && (
            <p className="mt-1 text-xs text-emerald-600">
              You previously accepted these terms on {new Date(previouslyAcceptedAt).toLocaleString()}.
            </p>
          )}
        </div>
      </section>

      {/* Body */}
      <div className="mx-auto max-w-5xl px-4 pb-16 grid gap-10 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="sticky top-20 self-start hidden lg:block">
          <nav className="rounded-2xl border border-slate-200 p-4 bg-white">
            <div className="text-xs font-semibold text-slate-500 mb-2">On this page</div>
            <ul className="space-y-1 text-sm">
              {SECTIONS.map(([id, label]) => {
                const active = activeId === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggleSection(id)}
                      className={[
                        "w-full text-left px-2 py-1 rounded-md flex items-center justify-between",
                        active ? "bg-slate-900/5 text-slate-900" : "text-slate-700 hover:bg-slate-900/5",
                      ].join(" ")}
                      aria-expanded={active}
                      aria-controls="content-root"
                    >
                      <span>{label}</span>
                      <span className="text-slate-500">{active ? "▾" : "▸"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Center content as cards */}
        <main id="content-root" className="max-w-none">
          {!activeId ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Select a section on the left to view it as cards.
            </div>
          ) : (
            <SectionCards
              id={activeId}
              agree={agree}
              setAgree={setAgree}
              onContinue={handleContinue}
              openFaq={openFaq}
              setOpenFaq={setOpenFaq}
              onJumpPrivacy={() => toggleSection("privacy")}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- Cards primitives ---------- */
function CardsGrid({ children }) {
  return (
    <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2">{children}</div>
  );
}

function Card({ title, children, footer }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
      {title && <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>}
      <div className="text-sm text-slate-700">{children}</div>
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

/* ---------- Section -> Cards renderer ---------- */
function SectionCards({ id, agree, setAgree, onContinue, openFaq, setOpenFaq, onJumpPrivacy }) {
  switch (id) {
    case "intro":
      return (
        <CardsGrid>
          <Card title="Platform">
            The SmartCar AI website/app, services, APIs, and related tools.
          </Card>
          <Card title="Customer">
            End-users renting vehicles or hiring drivers through the Platform.
          </Card>
          <Card title="Showroom Owner (Host)">
            A person or business listing vehicles on the Platform.
          </Card>
          <Card title="Driver">A verified driver engaged via the Platform.</Card>
          <Card title="Agreement">
            These terms form a legally binding agreement between you and SmartCar AI. If you do not agree, do not use the Platform.
          </Card>
        </CardsGrid>
      );

    case "eligibility":
      return (
        <CardsGrid>
          <Card title="Age & Capacity">You must be at least 18 and able to form a contract in your locality.</Card>
          <Card title="Accurate Info">Keep identity, business registration, licenses, and vehicle docs up-to-date.</Card>
          <Card title="Account Security">You are responsible for safeguarding credentials and activity.</Card>
        </CardsGrid>
      );

    case "listings":
      return (
        <CardsGrid>
          <Card title="Authorization & Compliance">List only vehicles you own/are authorized to manage; comply with laws, inspections, insurance.</Card>
          <Card title="Accuracy">Photos, specs, pricing, availability, fees, restrictions must be accurate.</Card>
          <Card title="Moderation">We may re-categorize, hide, or remove unsafe or policy-violating listings.</Card>
        </CardsGrid>
      );

    case "pricing":
      return (
        <CardsGrid>
          <Card title="Host Pricing">Hosts set base prices; platform and processing fees may apply.</Card>
          <Card title="Taxes">You’re responsible for VAT/GST and income taxes; we may collect where required.</Card>
        </CardsGrid>
      );

    case "booking":
      return (
        <CardsGrid>
          <Card title="Confirmation">A booking is confirmed when payment is authorized and confirmations are sent.</Card>
          <Card title="Host Cancellations">Honor accepted bookings; unjustified cancellations may incur penalties.</Card>
          <Card title="Customer Cancellations">Refunds follow the shown cancellation policy and applicable law.</Card>
        </CardsGrid>
      );

    case "payments":
      return (
        <CardsGrid>
          <Card title="Processing & Timing">Payout timing may vary due to holds, refunds, or compliance checks.</Card>
          <Card title="Disputes & Fraud">Chargebacks/disputes/fraud may cause withholdings or reversals.</Card>
          <Card title="Payout Details">Provide accurate payout info; we’re not liable for failed payouts due to errors.</Card>
        </CardsGrid>
      );

    case "insurance":
      return (
        <CardsGrid>
          <Card title="Insurance">Maintain legally required insurance; ensure vehicles are roadworthy.</Card>
          <Card title="Damage Claims">Document promptly with photos, logs, and reports; cooperate to resolve.</Card>
          <Card title="Driver Safety">Drivers must be licensed/vetted and follow laws and safety limits.</Card>
        </CardsGrid>
      );

    case "conduct":
      return (
        <CardsGrid>
          <Card title="No Illegal Activity">No fraud or misrepresentation.</Card>
          <Card title="No Abuse">No discriminatory, abusive, or harassing behavior.</Card>
          <Card title="Vehicle Integrity">No stolen/unsafe vehicles or falsified documents.</Card>
          <Card title="No Circumvention">Don’t bypass the Platform to avoid fees on Platform-originated bookings.</Card>
        </CardsGrid>
      );

    case "ratings":
      return (
        <CardsGrid>
          <Card title="Reviews">
            Reviews should be fair and factual. Content with hate, harassment, or clear misinformation may be removed. Negative sentiment alone isn’t removed.
          </Card>
        </CardsGrid>
      );

    case "content":
      return (
        <CardsGrid>
          <Card title="License to SmartCar AI">
            You grant a non-exclusive, worldwide, royalty-free license to host, use, display, and distribute listing materials for operations and promotion.
          </Card>
          <Card title="Respect IP">Upload only content you have rights to; respect third-party IP.</Card>
        </CardsGrid>
      );

    case "privacy":
      return (
        <CardsGrid>
          <Card title="Privacy & Data">
            We process personal data per our Privacy Policy. If you act as an independent controller (e.g., your customer lists), comply with applicable data laws.
          </Card>
        </CardsGrid>
      );

    case "uptime":
      return (
        <CardsGrid>
          <Card title="Service Changes">
            We may modify or discontinue features, perform maintenance, or provide beta functionality. No guarantee of uninterrupted service.
          </Card>
        </CardsGrid>
      );

    case "liability":
      return (
        <CardsGrid>
          <Card title="Limitation of Liability">
            To the maximum extent permitted by law, we’re not liable for indirect, incidental, special, or consequential damages.
          </Card>
          <Card title="Indemnity">
            You agree to indemnify and hold us harmless from claims arising from your breach, your listings, or your use of the Platform.
          </Card>
        </CardsGrid>
      );

    case "termination":
      return (
        <CardsGrid>
          <Card title="Suspension/Termination">
            We may suspend/terminate accounts that violate terms/laws or pose risk. Outstanding obligations (payments, disputes) survive.
          </Card>
        </CardsGrid>
      );

    case "disputes":
      return (
        <CardsGrid>
          <Card title="Dispute Resolution">
            Start with support. If unresolved, disputes follow governing law and forum specified by the operating entity.
          </Card>
        </CardsGrid>
      );

    case "changes":
      return (
        <CardsGrid>
          <Card title="Updates to Terms">
            We may update terms; material changes will be notified. Continued use after effective date means acceptance.
          </Card>
        </CardsGrid>
      );

    case "contact":
      return (
        <CardsGrid>
          <Card title="Contact">
            Questions? <a className="underline" href="mailto:support@smartcar.example">support@smartcar.example</a><br />
            <em className="text-xs text-slate-500">For general information only; not legal advice.</em>
          </Card>
        </CardsGrid>
      );

    case "faq":
      return (
        <CardsGrid>
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <Card
                key={i}
                title={
                  <button
                    className="w-full text-left flex items-center justify-between"
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="pr-3">{f.q}</span>
                    <span className="text-slate-500">{open ? "▾" : "▸"}</span>
                  </button>
                }
              >
                {open ? f.a : <span className="text-slate-500">Click to view the answer.</span>}
              </Card>
            );
          })}
        </CardsGrid>
      );

    case "accept":
      return (
        <CardsGrid>
          <Card
            title="Accept Terms & Continue"
            footer={
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onContinue}
                  disabled={!agree}
                  className={[
                    "inline-flex items-center justify-center h-10 px-4 rounded-lg text-sm font-medium transition-colors",
                    agree ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-200 text-slate-500 cursor-not-allowed",
                  ].join(" ")}
                  aria-disabled={!agree}
                >
                  Register 
                </button>
                <span className="text-xs text-slate-500">
                  Clicking “Register Your Car” takes you to host onboarding.
                </span>
              </div>
            }
          >
            <label className="flex items-start gap-3 select-none">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                aria-describedby="terms-desc"
              />
              <span className="text-sm">
                I have read and accept SmartCar AI’s{" "}
                <button
                  onClick={(e) => e && onJumpPrivacy()}
                  className="underline hover:no-underline"
                >
                  Privacy &amp; Data
                </button>{" "}
                and all Terms on this page.
              </span>
            </label>
            <p id="terms-desc" className="mt-2 text-xs text-slate-500">
              You must accept to proceed to host onboarding and register your showroom/vehicles.
            </p>
          </Card>
        </CardsGrid>
      );

    default:
      return null;
  }
}

/* ---------- FAQ data ---------- */
const FAQS = [
  {
    q: "What documents do I need to list my showroom?",
    a: (
      <ul className="list-disc pl-5">
        <li>Proof of ownership/authorization for each vehicle</li>
        <li>Valid insurance and inspection certificates (where applicable)</li>
        <li>Business registration (if required in your jurisdiction)</li>
      </ul>
    ),
  },
  {
    q: "How are my prices and fees shown to customers?",
    a: <p>You set a base price per vehicle. Platform and processing fees are shown at checkout. Taxes may be collected where required by law.</p>,
  },
  {
    q: "Can I cancel a confirmed booking?",
    a: <p>Cancellations should be rare. Unjustified cancellations may result in penalties, lower search ranking, or temporary suspension.</p>,
  },
  {
    q: "When do I receive payouts?",
    a: <p>Payouts are initiated after the rental start (or per your agreement). Banking delays, holds, disputes, or fraud checks may affect timing.</p>,
  },
  {
    q: "Who covers accidents or damages?",
    a: <p>Hosts must maintain legally required insurance. Damage claims follow your policy, local law, and Platform guidance with required documentation.</p>,
  },
  {
    q: "Can I communicate with customers directly?",
    a: <p>Yes—use the Platform’s messaging. Circumventing the Platform to avoid fees for Platform-originated bookings is prohibited.</p>,
  },
  {
    q: "How are drivers verified?",
    a: <p>Drivers undergo license and identity checks. Additional screenings may apply by region and partner requirements.</p>,
  },
  {
    q: "Can I list vehicles that are temporarily unavailable?",
    a: <p>Yes, but keep availability accurate to avoid cancellations. You can temporarily hide or pause listings.</p>,
  },
  {
    q: "Do you provide photography or listing help?",
    a: <p>We provide best-practice guidelines. In select regions, you may request pro-photo services or templates.</p>,
  },
  {
    q: "How do reviews work?",
    a: <p>Customers and hosts may review each other after a trip. We remove content that violates policy (hate, harassment, etc.).</p>,
  },
  {
    q: "What taxes am I responsible for?",
    a: <p>You’re responsible for your business taxes (e.g., income tax). We may collect/remit transactional taxes where required.</p>,
  },
  {
    q: "How do I close my account?",
    a: <p>Reach out to support. Pending payouts, disputes, or claims must be resolved first. Some data may be retained as required by law.</p>,
  },
];
