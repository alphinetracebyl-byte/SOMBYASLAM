import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const FROM_EMAIL       = Deno.env.get('SENDGRID_FROM_EMAIL') ?? 'noreply@somlits.gov.so';
const FROM_NAME        = 'SOMLITS — Somalia Livestock System';

interface Payload {
  to:          string;
  farmerName:  string;
  farmerCode:  string;
  status:      'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'REINSTATED';
  reason?:     string;
}

function buildEmail(p: Payload): { subject: string; html: string } {
  const first = p.farmerName.split(' ')[0];
  const footer = `
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:2rem 0 1rem"/>
    <p style="font-size:12px;color:#94a3b8;margin:0">
      Ministry of Livestock, Forestry &amp; Range — Federal Government of Somalia<br/>
      Somalia Livestock Identification &amp; Traceability System (SOMLITS)
    </p>`;

  switch (p.status) {
    case 'APPROVED':
      return {
        subject: 'Your SOMLITS Registration Has Been Approved',
        html: `
          <h2 style="color:#166534">Congratulations, ${first}!</h2>
          <p>Your registration with the Somalia Livestock Identification and Traceability System (SOMLITS) has been <strong>approved</strong> by the Ministry of Livestock.</p>
          <table style="border:1px solid #e2e8f0;border-radius:8px;padding:1rem 1.25rem;margin:1.5rem 0;background:#f0fdf4">
            <tr><td style="color:#475569;font-size:13px;padding-bottom:4px">Your Client ID</td></tr>
            <tr><td style="font-size:24px;font-weight:700;color:#166534;letter-spacing:0.05em">${p.farmerCode}</td></tr>
          </table>
          <p>You can now log in to the SOMLITS Farmer Portal to manage your livestock records, view your premises, and track your animals.</p>
          ${footer}`,
      };

    case 'REJECTED':
      return {
        subject: 'SOMLITS Registration — Application Update',
        html: `
          <h2 style="color:#991b1b">Dear ${first},</h2>
          <p>We regret to inform you that your SOMLITS registration application has <strong>not been approved</strong> at this time.</p>
          ${p.reason ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:0.875rem 1rem;margin:1.25rem 0;border-radius:4px"><strong>Reason:</strong> ${p.reason}</div>` : ''}
          <p>If you believe this is an error or you have additional documentation to provide, please contact your regional Ministry office or visit the nearest livestock registration centre.</p>
          ${footer}`,
      };

    case 'SUSPENDED':
      return {
        subject: 'Your SOMLITS Account Has Been Suspended',
        html: `
          <h2 style="color:#92400e">Dear ${first},</h2>
          <p>Your SOMLITS account (Client ID: <strong>${p.farmerCode}</strong>) has been <strong>suspended</strong> and access to services has been restricted.</p>
          ${p.reason ? `<div style="background:#fffbeb;border-left:4px solid #d97706;padding:0.875rem 1rem;margin:1.25rem 0;border-radius:4px"><strong>Reason:</strong> ${p.reason}</div>` : ''}
          <p>To appeal this decision or seek clarification, please contact your regional Ministry of Livestock office.</p>
          ${footer}`,
      };

    case 'REINSTATED':
      return {
        subject: 'Your SOMLITS Account Has Been Reinstated',
        html: `
          <h2 style="color:#166534">Dear ${first},</h2>
          <p>Your SOMLITS account (Client ID: <strong>${p.farmerCode}</strong>) has been <strong>reinstated</strong> and full access to services has been restored.</p>
          <p>You can now log in to the SOMLITS Farmer Portal and access all livestock management features.</p>
          ${footer}`,
      };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json() as Payload;
    if (!payload.to || !payload.farmerName || !payload.farmerCode || !payload.status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { subject, html } = buildEmail(payload);

    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: payload.to, name: payload.farmerName }] }],
        from:    { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    if (!sgRes.ok) {
      const detail = await sgRes.text();
      console.error('SendGrid error:', detail);
      return new Response(JSON.stringify({ error: 'SendGrid rejected request', detail }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('notify-farmer error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
