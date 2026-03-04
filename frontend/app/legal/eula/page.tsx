export const metadata = {
  title: 'End-User License Agreement — Apex Field OS',
};

export default function EulaPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 font-sans text-gray-800">
      <h1 className="text-3xl font-semibold mb-2">End-User License Agreement</h1>
      <p className="text-sm text-gray-500 mb-10">Last updated: March 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <p>
          This End-User License Agreement (&quot;Agreement&quot;) is a legal agreement between you
          (&quot;User&quot;) and Apex Consulting &amp; Surveying, Inc. (&quot;Apex&quot;, &quot;we&quot;, &quot;us&quot;) governing
          your use of Apex Field OS (the &quot;Software&quot;).
        </p>

        <div>
          <h2 className="text-base font-semibold mb-2">1. Grant of License</h2>
          <p>
            Apex grants you a limited, non-exclusive, non-transferable license to use the
            Software solely for internal business operations. This license is restricted to
            authorized personnel of Apex Consulting &amp; Surveying, Inc.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">2. Restrictions</h2>
          <p>You may not:</p>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>Copy, modify, or distribute the Software to third parties</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Use the Software for any unlawful purpose</li>
            <li>Share access credentials with unauthorized individuals</li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">3. QuickBooks Integration</h2>
          <p>
            The Software integrates with Intuit QuickBooks Online via OAuth 2.0. By connecting
            your QuickBooks account, you authorize the Software to access your QuickBooks data
            solely for the purpose of syncing clients, generating invoices, and tracking
            payments on your behalf. We do not store your QuickBooks credentials and access
            may be revoked at any time from your QuickBooks account settings.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">4. Data Ownership</h2>
          <p>
            All data entered into the Software remains the property of Apex Consulting &amp;
            Surveying, Inc. We do not sell, share, or transfer your business data to any
            third party except as required to operate integrated services (e.g., QuickBooks,
            AI providers).
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">5. Disclaimer of Warranties</h2>
          <p>
            The Software is provided &quot;as is&quot; without warranty of any kind. Apex makes no
            warranties, express or implied, regarding fitness for a particular purpose,
            accuracy, or uninterrupted operation.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Apex shall not be liable for any indirect,
            incidental, or consequential damages arising from your use of the Software.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">7. Termination</h2>
          <p>
            This license is effective until terminated. Your rights terminate automatically if
            you violate any terms of this Agreement.
          </p>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">8. Contact</h2>
          <p>
            Questions about this Agreement may be directed to:{' '}
            <a href="mailto:info@apexsurveying.com" className="text-blue-600 underline">
              info@apexsurveying.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
