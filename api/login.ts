export default async function handler(req: any, res: any) {
  // Since the React app handles logins client-side (via Supabase auth client),
  // any HTTP POST request directly sent to /login on the hosting server is likely
  // an automated brute-force attempt or security scan.
  // To avoid false positives (e.g. scanners treating HTTP 405 Method Not Allowed as a success),
  // we intercept these POST requests and return a standard 401 Unauthorized response.
  if (req.method === 'POST') {
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password'
    })
  }

  // Fallback for other methods (though this route is configured in vercel.json
  // to only match POST requests).
  return res.status(404).json({
    success: false,
    error: 'Not Found'
  })
}
