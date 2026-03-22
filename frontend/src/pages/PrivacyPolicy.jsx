import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const S = ({ children }) => <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f0f4ff', margin: '32px 0 12px' }}>{children}</h2>;
const P = ({ children }) => <p style={{ fontSize: 14, color: '#6a7a9a', lineHeight: 1.8, margin: '0 0 12px' }}>{children}</p>;

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: '100vh', background: '#03030a', color: '#F5F5FA' }}>
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size="md" />
          <Link to="/dashboard" style={{ fontSize: 13, color: '#4f8ef7', textDecoration: 'none' }}>Back to Dashboard</Link>
        </div>
      </nav>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#f0f4ff', marginBottom: 8 }}>Privacy Policy</h1>
        <P>Effective Date: March 22, 2026</P>
        <P>This Privacy Policy describes how Sharpr (sharprapp.com), operated by Agostino Vitiello, collects, uses, and protects your information.</P>

        <S>1. Information We Collect</S>
        <P><strong style={{ color: '#94A3B8' }}>Account Information:</strong> When you register, we collect your email address and an encrypted password (managed by Supabase Auth). If you choose a username, we store that as well.</P>
        <P><strong style={{ color: '#94A3B8' }}>Usage Data:</strong> We collect information about how you use Sharpr, including pages visited, features used, and AI queries made. This helps us improve the product.</P>
        <P><strong style={{ color: '#94A3B8' }}>Payment Information:</strong> If you subscribe to Pro, payment is processed by Stripe. We do NOT store your credit card number, CVV, or full card details. We receive only a Stripe customer ID and subscription status.</P>
        <P><strong style={{ color: '#94A3B8' }}>Journal Data:</strong> Trade logs, bet logs, notes, and other content you enter into Sharpr is stored in our database and associated with your account.</P>

        <S>2. How We Use Your Information</S>
        <P>We use your information to: (a) provide and maintain the Sharpr service; (b) process your subscription and payments; (c) send transactional emails (account confirmation, payment receipts); (d) improve the platform based on usage patterns; (e) respond to support requests. We do NOT sell your personal data to third parties. We do NOT send marketing emails unless you opt in.</P>

        <S>3. Third-Party Services</S>
        <P>Sharpr uses the following third-party services that may process your data:</P>
        <P><strong style={{ color: '#94A3B8' }}>Supabase</strong> — authentication and database hosting (your account data, journal entries).</P>
        <P><strong style={{ color: '#94A3B8' }}>Stripe</strong> — payment processing for Pro subscriptions. Stripe's privacy policy applies to payment data.</P>
        <P><strong style={{ color: '#94A3B8' }}>Anthropic (Claude AI)</strong> — powers AI Research and Sharp Signals. Your queries are sent to Anthropic's API for processing. We do not send your personal information or journal data to Anthropic — only the specific query text.</P>
        <P><strong style={{ color: '#94A3B8' }}>The Odds API</strong> — provides sports odds data. No personal data is shared with this service.</P>
        <P><strong style={{ color: '#94A3B8' }}>Vercel</strong> — hosts the frontend. Standard web server logs may be collected.</P>
        <P><strong style={{ color: '#94A3B8' }}>Railway</strong> — hosts the backend API. Standard server logs may be collected.</P>

        <S>4. Data Retention</S>
        <P>We retain your account data and journal entries as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required by law to retain it. Anonymized, aggregated data may be retained indefinitely for analytics purposes.</P>

        <S>5. Your Rights</S>
        <P>You have the right to: (a) access your personal data; (b) correct inaccurate data; (c) request deletion of your account and data; (d) export your journal data. To exercise any of these rights, email support@sharprapp.com. We will respond within 30 days.</P>

        <S>6. Cookies</S>
        <P>Sharpr uses minimal cookies — primarily for authentication session management (Supabase auth tokens stored in localStorage). We do not use advertising cookies or third-party tracking cookies. We use no analytics tracking scripts.</P>

        <S>7. Children's Privacy</S>
        <P>Sharpr is not intended for anyone under 18 years of age. We do not knowingly collect personal information from children. If we become aware that we have collected data from someone under 18, we will delete that information promptly.</P>

        <S>8. Changes to This Policy</S>
        <P>We may update this Privacy Policy from time to time. We will notify you of material changes via email or a notice on the platform. The "Effective Date" at the top will be updated accordingly.</P>

        <S>9. Contact</S>
        <P>For questions about this Privacy Policy or to exercise your data rights, contact us at support@sharprapp.com.</P>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 40, paddingTop: 20, display: 'flex', gap: 16, fontSize: 12, color: '#2a3a5a' }}>
          <Link to="/terms" style={{ color: '#4a5a7a', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/dashboard" style={{ color: '#4a5a7a', textDecoration: 'none' }}>Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
