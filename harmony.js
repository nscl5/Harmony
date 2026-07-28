/**
 * Harmony - VLESS Subscription Generator for Cloudflare Workers
 * - Last Update: Tue, December 25, 2025, 04:20 UTC
 * - https://github.com/NiREvil/Harmony
 * 
 * This worker builds a V2Ray subscription link with the ability to automatically add 
 * Cloudflare clean IPs to your VLESS configurations.
 * 
 * HOW IT WORKS:
 * 1. Create one VLESS config using any method/tool you prefer
 * 2. Extract the UUID and hostname from your config
 * 3. Replace the values in USER_SETTINGS object:
 *    - UUID in line 32
 *    - Hostname in each group's "host" parameter (lines 55, 69, 83)
 *    - SNI in each group's "sni" parameter (lines 56 70, 84)
 * 4. Deploy this worker and use the worker URL as your subscription link
 * 5. Every time you click "Update" in your client, fresh clean IPs are automatically injected
 * 
 * FEATURES:
 * - Generates 30 VLESS configs (10 per group by default, customizable via ipCount line 35.)
 * - Supports both TLS and non-TLS configurations
 * - Auto-fetches clean Cloudflare IPs from multiple sources
 * - Fake subscription info for client compatibility
 * - Randomizable paths and SNI for better censorship resistance
 * 
 */


// ——— USER CONFIGURATION SECTION ———
const USER_SETTINGS = {
  // Your UUID - Replace with your own UUID
  uuid: "a22bff60-a40a-4250-bde2-4c660e363b47",

  // Number of configs (IPs) per group
  ipCount: 10,

  // Early Data settings (optional) - Advanced feature for performance optimization
  ed: "2560",
  eh: "Sec-WebSocket-Protocol",

  /** 
   * ——— Configuration Groups ———
   * - You can add, remove, or modify groups as needed
   * - Each group can have different settings for hosts, ports, TLS, etc.
   * 
   * Available Clean IP Source options:
   *   - "static": Uses manually defined IPs from the staticIPs array
   *   - "dynamic1": Fetches IPs from NiREvil's GitHub repository
   *   - "dynamic2": Fetches IPs from strawberry API
   */
  groups: [
    {
      // ——— Group 1: TLS Configuration ———
      name: "| HAЯMOИY ᵀᴸˢ |",
      host: "index.harmonica01.workers.dev",
      sni: "index.harmonica01.workers.dev",
      path: "/random:16", // Path with 16 random characters
      tls: true,
      allowInsecure: true,
      ports: ["443", "8443", "2053", "2083", "2087", "2096"], // Standard cloudflare TLS ports
      alpn: "http/1.1", // Application-layer protocol negotiation (websocket only support http/1.1)
      fp: ["chrome"], // Client fingerprint (currently only chrome works reliably)
      dataSource: "dynamic1", // Use the first IP source
      randomizeSni: true, // Set to true to randomize SNI character casing
    },
    {
      // ——— Group 2: Non-TLS Configuration (TCP), ONLY Workers, No pages.dev ———
      name: "| HAЯMOИY ᵀᶜᴾ |",
      host: "index.harmonica02.workers.dev",
      sni: "", // Must be empty for non-TLS
      path: "/random:16",
      tls: false,
      allowInsecure: false,
      ports: ["80", "8080", "8880", "2052", "2082", "2086", "2095"], // Standard cloudflare HTTP ports
      alpn: "", // Must be empty for non-TLS
      fp: ["chrome"],
      dataSource: "dynamic2", // Use the second IP source
      randomizeSni: false,
    },
    {
      // ——— Group 3: Alternative TLS Configuration ———
      name: "| HAЯMOИY ᴱᴹˢ |",
      host: "index.harmonica01.workers.dev",
      sni: "index.harmonica01.workers.dev",
      path: "/random:16?ed=2048", // Fixed path value optimized for xray core
      tls: true,
      allowInsecure: true,
      ports: ["443", "8443", "2053"],
      alpn: "http/1.1",
      fp: ["chrome"],
      dataSource: "static", // Use static IPs
      randomizeSni: true,
    },
  ],
};

/**
 * ——— IP DATA SOURCES ———
 * Static IP list - Manually defined IPs and domains
 * You can add or remove IPs as needed
 */
const staticIPs = [
  '[::ffff:be5d:f6f1]',
  '[::ffff:5fb3:83ef]',
  '[::ffff:8d0:1652]',
  '[::ffff:8d0:1925]',
  '[::ffff:8d0:aa9]',
  '[::ffff:c629:df08]',
  '[::ffff:c629:c411]',
  '[::ffff:6812:c8dc]',
  '[::ffff:4044:c001]',
  '[::ffff:42eb:c8fd]',
  '[::ffff:a29f:2023]',
  '[::ffff:6813:13b]',
  '[::ffff:c629:c7a6]',
  '[::ffff:8d65:7159]',
  '[::ffff:6814:e7d2]',
  '[::ffff:adf5:3a22]',
  '[::ffff:681f:1041]',
  '[::ffff:681f:106d]',
  '[::ffff:6815:d34a]',
  '[::ffff:54f:5972]',
  '[::ffff:d34:54aa]',
  '[::ffff:de1:4e1b]',
  '[::ffff:34d8:8222]',
  '[::ffff:c7d4:5a46]',

  'creativecommons.org',
  'sky.rethinkdns.com',
  'www.speedtest.net',
  'www.cdnjs.com',
  'singapore.com',
  'go.inmobi.com',
  'www.visa.com',
  'www.wto.org',
  'lb.nscl.ir',
  'cdnjs.com',
  'csgo.com',
  'zula.ir',
  'fbi.gov',
  'time.is',
  'icook.hk',
  '172.64.95.71',
  '198.41.209.210',
  '141.101.120.246',
  '141.101.120.187',
  '162.159.128.242',
  '198.41.209.120',
  '198.41.209.192',
  '162.159.237.238',
  '172.67.146.28',
  '172.67.116.63',
];

// Dynamic IP source URLs
const ipSourceURLs = {
  // Cloudflare clean IPs are sourced from the NiREvil GitHub repository, updated every 3 hours.
  dynamic1: "https://raw.githubusercontent.com/NiREvil/vless/refs/heads/main/Cloudflare-IPs.json",
  dynamic2: "https://strawberry.victoriacross.ir"
};

/**
 * ——— CAKE SUBSCRIPTION INFO SETTINGS ———
 * These values create fake usage statistics for subscription clients
 * Customize these values to display desired traffic and expiry information
 */
const CAKE_INFO = {
  total_TB: 382, // Total traffic quota in Terabytes
  base_GB: 88000, // Base usage that's always shown (in Gigabytes)
  daily_growth_GB: 250, // Daily traffic growth (in Gigabytes) - simulates gradual usage
  expire_date: "2028-04-20" // Subscription expiry date (YYYY-MM-DD)
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

/**
 *  ——— MAIN REQUEST HANDLER ———
 * Generates VLESS configurations and returns them as a base64-encoded subscription
 * @param {Request} _request - The incoming HTTP request
 * @returns {Promise<Response>} - Response containing base64-encoded VLESS links
 */

async function fetchWithTimeout(url, ms = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleRequest(_request) {
  const url = new URL(_request.url);
  const subNameParam = url.searchParams.get('name');
  const subNameHash = url.hash ? decodeURIComponent(url.hash.substring(1)) : null;
  const profileTitle = subNameParam || subNameHash || "Harmony";
  const configsList = [];

  try {
    // Fetch dynamic IP lists from external sources
    const [ipv4listRE1, ipv4listRE2] = await Promise.all([
      fetchWithTimeout(ipSourceURLs.dynamic1)
        .then((res) => res.json())
        .catch(() => ({ ipv4: [] })),
      fetchWithTimeout(ipSourceURLs.dynamic2)
        .then((res) => res.json())
        .catch(() => ({ data: [] }))
    ]);

    // Extract IP addresses from responses
    const ipListRE1 = (ipv4listRE1.ipv4 || [])
      .map((/** @type {{ ip: any; }} */ ipData) => ipData.ip)
      .filter((/** @type {any} */ ip) => ip);
    const ipListRE2 = (ipv4listRE2.data || [])
      .map((/** @type {{ ipv4: any; }} */ item) => item.ipv4)
      .filter((/** @type {any} */ ip) => ip);

    // Prepare IP data sources with shuffled, deduplicated lists
    const ipDataSources = {
      static: shuffleArray([...new Set(staticIPs)]),
      dynamic1: shuffleArray([...new Set(ipListRE1)]),
      dynamic2: shuffleArray([...new Set(ipListRE2)])
    };

    // Generate configurations based on defined groups
    for (const group of USER_SETTINGS.groups) {
      const ipList = ipDataSources[group.dataSource] || [];
      const uniqueIPs = new Set();

      for (const ip of ipList) {
        if (uniqueIPs.size >= USER_SETTINGS.ipCount) break;
        if (!uniqueIPs.has(ip)) {
          const vlessUrl = createVlessLink(ip, group, USER_SETTINGS);
          configsList.push(vlessUrl);
          uniqueIPs.add(ip);
        }
      }
    }

    // Generate fake subscription info headers
    const subInfo = generateCakeSubscriptionInfo();

    // Return base64-encoded configuration list with subscription headers
    const headers = {
      "Content-Type": "text/plain; charset=utf-8",
      "Profile-Update-Interval": "6", // Client should update every 6 hours
      "Subscription-Userinfo": subInfo, // Cake usage statistics
    };

    if (profileTitle) {
      headers["Profile-Title"] = profileTitle;
    }

    return new Response(btoa(configsList.join("\n")), {
      status: 200,
      headers: headers
    });
  } catch (error) {
    // Error handling - return empty config list on failure
    return new Response(btoa("# Error generating configurations"), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
}

/**
 * ——— VLESS LINK GENERATION ———
 * Creates a VLESS link based on group settings
 * @param {string} ip - The IP address or domain to use
 * @param {Object} group - Group configuration object
 * @param {Object} settings - Global user settings
 * @returns {string} - Complete VLESS URL
 */
function createVlessLink(ip, group, settings) {
  // Select random port and fingerprint from group lists
  const randomPort = group.ports[Math.floor(Math.random() * group.ports.length)];
  const randomFp = group.fp[Math.floor(Math.random() * group.fp.length)];

  // Process path: replace "random:N" with N random characters
  let finalPath = group.path;
  if (finalPath.includes("random:")) {
    try {
      const length = parseInt(finalPath.match(/random:(\d+)/)?.[1] || "10");
      const randomString = generateRandomPath(length);
      finalPath = finalPath.replace(/random:\d+/, randomString);
    } catch (e) {
      // On error, keep original path
    }
  }

  // Build query parameters for VLESS URL
  const queryParams = new URLSearchParams({
    path: finalPath,
    encryption: "none",
    type: "ws", // WebSocket transport
    host: group.host,
    fp: randomFp,
    ed: settings.ed,
    eh: settings.eh
  });

  // Apply TLS-specific settings if enabled
  if (group.tls) {
    queryParams.set("security", "tls");

    // Handle SNI (Server Name Indication)
    let sniValue = group.sni || group.host;

    // Randomize SNI casing if enabled (helps bypass some filtering)
    if (group.randomizeSni) {
      sniValue = randomizeCase(sniValue);
    }

    queryParams.set("sni", sniValue);

    if (group.alpn) {
      queryParams.set("alpn", group.alpn);
    }
    if (group.allowInsecure) {
      queryParams.set("allowInsecure", "1");
    }
  }
  // For non-TLS: security and sni parameters are automatically omitted
  const ps = encodeURIComponent(group.name);
  return `vless://${settings.uuid}@${ip}:${randomPort}?${queryParams.toString()}#${ps}`;
}

// ——— UTILITY FUNCTIONS ———

/**
 * Generates a random alphanumeric string for path obfuscation
 * @param {number} length - Desired length of random string
 * @returns {string} - Random string
 */
function generateRandomPath(length) {
  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

/**
 * Randomizes character casing in a string
 * Useful for SNI randomization to bypass certain filters
 * @param {string} str - Input string (e.g., SNI domain)
 * @returns {string} - String with randomized casing
 */
function randomizeCase(str) {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    // 50% chance to uppercase each character
    result += Math.random() < 0.5 ? str[i].toUpperCase() : str[i].toLowerCase();
  }
  return result;
}

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffleArray(array) {
  const shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generates fake subscription information header
 * Creates dynamic usage statistics that change throughout the day
 * @returns {string} - Formatted subscription info string
 */
function generateCakeSubscriptionInfo() {
  const GB_in_bytes = 1024 * 1024 * 1024;
  const TB_in_bytes = 1024 * GB_in_bytes;

  const total_bytes = CAKE_INFO.total_TB * TB_in_bytes;
  const base_bytes = CAKE_INFO.base_GB * GB_in_bytes;

  // Calculate dynamic usage based on current hour of day
  const now = new Date();
  const hours_passed = now.getHours() + now.getMinutes() / 60;
  const daily_growth_bytes = (hours_passed / 24) * (CAKE_INFO.daily_growth_GB * GB_in_bytes);

  // Split usage between upload and download
  const total_used = base_bytes + daily_growth_bytes;
  const cake_download = total_used / 2;
  const cake_upload = total_used / 2;

  // Convert expiry date to Unix timestamp
  const expire_timestamp = Math.floor(new Date(CAKE_INFO.expire_date).getTime() / 1000);

  // Return formatted subscription info string
  return `upload=${Math.round(cake_upload)}; download=${Math.round(cake_download)}; total=${total_bytes}; expire=${expire_timestamp}`;
}
