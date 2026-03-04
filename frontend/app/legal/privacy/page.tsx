export const metadata = {
  title: 'Privacy Policy — Apex Field OS',
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-sans text-gray-800">
      <h1 className="text-3xl font-semibold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: March 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          Apex Consulting &amp; Surveying, Inc. (&quot;Apex&quot;, &quot;we&quot;, &quot;us&quot;) operates Apex Field OS,
          an internal CRM and business operations platform. This Privacy Policy explains how
          we collect, use, and protect information in connection with the Software and its
          integrations.
        </p>

        <div>
          <h2 className="text-base font-semibold mb-2">1. Information We Collect</h2>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>User account information (name, email, role)</li>
            <li>Business data entered by authorized users (clients, projects, quotes, tasks)</li>
            <li>Time tracking and labor cost data</li>
            <li>QuickBooks connection tokens (encrypted, stored securely)</li>
            <li>Usage logs for system diagnostics</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">2. How We Use Information</h2>
          <p>Information collected is used exclusively to:</p>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Operate and maintain the Software for authorized users</li>
            <li>Sync data with connected services (QuickBooks Online)</li>
            <li>Generate AI-assisted reports and analysis using anonymized business metrics</li>
            <li>Provide support and diagnose technical issues</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">3. QuickBooks Integration</h2>
          <p>
            When you connect your QuickBooks Online account, we receive and store OAuth access
            and refresh tokens to perform authorized data operations on your behalf. We access
            only the data necessary to sync clients, invoices, and payments. We do not store
            your QuickBooks login credentials. You may disconnect at any time from the
            QuickBooks admin page within the Software or directly from your Intuit account.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">4. AI Providers</h2>
          <p>
            The Software may send anonymized operational data (e.g., project stage statistics,
            task counts) to third-party AI providers (Anthropic, OpenAI) to generate
            performance reports. No personally identifiable information is included in these
            requests. AI provider data handling is governed by their respective privacy policies.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">5. Data Storage &amp; Security</h2>
          <p>
            All data is stored in an encrypted PostgreSQL database hosted on Neon. Access is
            restricted to authorized personnel only. Passwords are hashed using bcrypt. OAuth
            tokens are stored encrypted at rest.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">6. Data Sharing</h2>
          <p>
            We do not sell or share your business data with any third party except as required
            to operate the Software&apos;s integrated services (QuickBooks Online, AI providers,
            cloud storage). We do not share data for advertising or marketing purposes.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">7. Data Retention</h2>
          <p>
            Data is retained for as long as the Software is in active use by Apex Consulting
            &amp; Surveying, Inc. Upon request, data may be exported or deleted in accordance
            with applicable law.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">8. Your Rights</h2>
          <p>
            Authorized users may request access to, correction of, or deletion of their
            personal data by contacting the system administrator.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">9. Contact</h2>
          <p>
            For privacy-related inquiries, contact:{' '}
            <a href="mailto:info@apexsurveying.com" className="text-blue-600 underline">
              info@apexsurveying.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
