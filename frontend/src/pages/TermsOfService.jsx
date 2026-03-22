import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const S = ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f4ff', margin: '32px 0 12px' }}>{children}</h2>;
const P = ({ children }) => <p style={{ fontSize: 14, color: '#6a7a9a', lineHeight: 1.8, margin: '0 0 12px' }}>{children}</p>;

export default function TermsOfService() {
  return (
    <div style={{ minHeight: '100vh', background: '#03030a', color: '#F5F5FA' }}>
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size="md" />
          <Link to="/dashboard" style={{ fontSize: 13, color: '#4f8ef7', textDecoration: 'none' }}>Back to Dashboard</Link>
        </div>
      </nav>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#f0f4ff', marginBottom: 8 }}>Terms of Service</h1>
        <P>Effective Date: March 22, 2026</P>
        <P>These Terms of Service ("Terms") govern your use of Sharpr (sharprapp.com), operated by Agostino Vitiello ("we", "us", "our"). By accessing or using Sharpr, you agree to be bound by these Terms.</P>

        <S>1. Acceptance of Terms</S>
        <P>By creating an account or using any part of Sharpr, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the service.</P>

        <S>2. Description of Service</S>
        <P>Sharpr is an analytics and insights platform for trading, sports betting, and prediction markets. We provide data visualization, AI-powered analysis, odds comparison, and journaling tools. Sharpr is NOT a broker, sportsbook, exchange, or financial institution. We do not place bets, execute trades, or hold funds on your behalf.</P>

        <S>3. No Financial or Betting Advice</S>
        <P>All content on Sharpr — including AI analysis, Sharp Signals, odds data, market probabilities, and any other information — is provided for informational and entertainment purposes only. Nothing on Sharpr constitutes financial advice, investment advice, betting advice, or a recommendation to buy, sell, or wager on anything. You are solely responsible for your own financial and betting decisions. Past performance data shown on the platform does not guarantee future results.</P>

        <S>4. User Responsibilities</S>
        <P>You must be at least 18 years old (or the legal gambling/trading age in your jurisdiction) to use Sharpr. You are responsible for ensuring that your use of the platform complies with all applicable local, state, and federal laws. You are solely responsible for any bets placed, trades executed, or financial decisions made using information from Sharpr.</P>

        <S>5. Pro Subscription</S>
        <P>Sharpr offers a paid Pro subscription billed monthly via Stripe. Subscriptions automatically renew unless cancelled before the billing date. You may cancel at any time through the Stripe customer portal — your access continues through the end of the current billing period. Refunds are generally not provided for digital subscription services, but we may issue refunds at our discretion for extenuating circumstances. Contact support@sharprapp.com for billing inquiries.</P>

        <S>6. Prohibited Uses</S>
        <P>You may not: (a) scrape, crawl, or automatically collect data from Sharpr; (b) resell, redistribute, or commercially exploit any data or content from the platform; (c) use the platform for any illegal activity; (d) attempt to gain unauthorized access to other accounts or our systems; (e) use the AI features to generate harmful, abusive, or misleading content; (f) create multiple accounts to circumvent free tier limits.</P>

        <S>7. Intellectual Property</S>
        <P>All content, design, code, and branding on Sharpr is owned by us or our licensors. You retain ownership of your own trade/bet journal data. By using the platform, you grant us a limited license to process your data solely to provide the service.</P>

        <S>8. Disclaimer of Warranties</S>
        <P>Sharpr is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee the accuracy, completeness, or timeliness of any data, odds, probabilities, or AI-generated analysis. Third-party data (from ESPN, The Odds API, Polymarket, etc.) is provided by those services and may contain errors or delays.</P>

        <S>9. Limitation of Liability</S>
        <P>To the maximum extent permitted by law, Sharpr and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to financial losses from trading or betting decisions. Our total liability is limited to the amount you have paid us in the three (3) months preceding the claim.</P>

        <S>10. Governing Law</S>
        <P>These Terms are governed by the laws of the State of New York, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of New York.</P>

        <S>11. Changes to Terms</S>
        <P>We may update these Terms at any time. Material changes will be communicated via email or a notice on the platform. Your continued use after changes constitutes acceptance of the updated Terms.</P>

        <S>12. Contact</S>
        <P>For questions about these Terms, contact us at support@sharprapp.com.</P>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 40, paddingTop: 20, display: 'flex', gap: 16, fontSize: 12, color: '#2a3a5a' }}>
          <Link to="/privacy" style={{ color: '#4a5a7a', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/dashboard" style={{ color: '#4a5a7a', textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
