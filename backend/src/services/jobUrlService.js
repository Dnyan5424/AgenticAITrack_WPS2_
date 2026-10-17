const dns = require('node:dns').promises;
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const REQUEST_TIMEOUT_MS = 10000;

function fail(message, status = 422) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isPublicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const octets = address.split('.').map(Number);
    const [a, b, c] = octets;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && (b === 168 || b === 0 || (b === 0 && c === 0) || (b === 0 && c === 2))) return false;
    if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
    if (a === 203 && b === 0 && c === 113) return false;
    return true;
  }
  if (family === 6) {
    const firstSegment = Number.parseInt(address.split(':')[0] || '0', 16);
    return firstSegment >= 0x2000 && firstSegment <= 0x3fff && !address.toLowerCase().startsWith('2001:db8:');
  }
  return false;
}

async function resolvePublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw fail('Enter a valid public job-posting URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw fail('Only public HTTP or HTTPS job-posting URLs can be analyzed.', 400);
  }
  if (url.port && url.port !== (url.protocol === 'https:' ? '443' : '80')) {
    throw fail('Job-posting URLs must use the standard HTTP or HTTPS port.', 400);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  let addresses;
  if (net.isIP(hostname)) {
    addresses = [{ address: hostname, family: net.isIP(hostname) }];
  } else {
    try {
      addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw fail('The job-posting host could not be reached. Check the URL and try again.');
    }
  }
  if (!addresses.length || addresses.some(record => !isPublicAddress(record.address))) {
    throw fail('This URL does not point to a publicly accessible host.', 400);
  }
  return { url, hostname, addresses };
}

function requestPage(target) {
  const transport = target.url.protocol === 'https:' ? https : http;
  const lookup = (_hostname, options, callback) => {
    if (options?.all) return callback(null, target.addresses);
    callback(null, target.addresses[0].address, target.addresses[0].family);
  };
  const agent = target.url.protocol === 'https:' ? new https.Agent({ lookup }) : new http.Agent({ lookup });

  return new Promise((resolve, reject) => {
    const request = transport.get({
      hostname: target.hostname,
      port: target.url.port || undefined,
      path: `${target.url.pathname}${target.url.search}`,
      headers: {
        Accept: 'text/html,application/xhtml+xml,text/plain,application/ld+json;q=0.9',
        'Accept-Encoding': 'identity',
        'User-Agent': 'SkillProofJobReader/1.0'
      },
      agent,
      servername: net.isIP(target.hostname) ? undefined : target.hostname
    }, response => {
      const chunks = [];
      let bytes = 0;
      response.on('data', chunk => {
        bytes += chunk.length;
        if (bytes > MAX_RESPONSE_BYTES) {
          request.destroy(fail('The job-posting page is too large to analyze.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({
        status: response.statusCode || 502,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    const timeout = setTimeout(() => request.destroy(fail('The job-posting page took too long to respond.')), REQUEST_TIMEOUT_MS);
    request.on('close', () => clearTimeout(timeout));
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(fail('The job-posting page took too long to respond.')));
    request.on('error', error => reject(error.status ? error : fail('Could not read this job-posting page. Check that it is public and try again.')));
  });
}

function decodeEntities(value) {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' };
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => {
      const point = Number.parseInt(code, 16);
      return point <= 0x10ffff ? String.fromCodePoint(point) : ' ';
    })
    .replace(/&#(\d+);?/g, (_, code) => {
      const point = Number.parseInt(code, 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : ' ';
    })
    .replace(/&([a-z]+);/gi, (entity, name) => named[name.toLowerCase()] || entity);
}

function plainText(value) {
  return decodeEntities(String(value || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);
}

function readAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function findJobPosting(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJobPosting(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.some(type => type === 'JobPosting')) return value;
  return findJobPosting(value['@graph']);
}

function parseJobPage(html) {
  const metadata = {};
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = readAttributes(match[0]);
    const key = (attributes.property || attributes.name || '').toLowerCase();
    if (key && attributes.content) metadata[key] = attributes.content;
  }

  let structuredJob = null;
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    try {
      structuredJob = findJobPosting(JSON.parse(match[1]));
      if (structuredJob) break;
    } catch {
      continue;
    }
  }

  const titleTag = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const title = plainText(structuredJob?.title || metadata['og:title'] || (titleTag ? titleTag[1] : ''));
  const organization = structuredJob?.hiringOrganization;
  const company = typeof organization === 'string' ? organization : organization?.name;
  const description = plainText(
    structuredJob?.description ||
    metadata.description ||
    metadata['og:description'] ||
    html
  );
  return { title: title.slice(0, 150), company: plainText(company || '').slice(0, 150), description };
}

function inferJobFromUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;

  let path;
  try {
    path = decodeURIComponent(url.pathname).toLowerCase().replace(/[_-]+/g, ' ');
  } catch {
    return null;
  }
  const roles = [
    {
      match: /\b(back end|backend|server side)\b/,
      title: 'Back-End Developer',
      skills: ['Node.js', 'Express', 'Python', 'Java', 'SQL', 'REST APIs', 'MongoDB', 'Docker', 'AWS', 'Automated testing']
    },
    {
      match: /\b(full stack|fullstack)\b/,
      title: 'Full-Stack Developer',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'SQL', 'REST APIs', 'Git']
    },
    {
      match: /\b(front end|frontend|web developer)\b/,
      title: 'Front-End Developer',
      skills: ['JavaScript', 'TypeScript', 'React', 'HTML/CSS', 'Automated testing', 'Git']
    },
    {
      match: /\b(data analyst|data analytics)\b/,
      title: 'Data Analyst',
      skills: ['Python', 'SQL', 'Data Analysis', 'Machine Learning']
    },
    {
      match: /\b(devops|site reliability)\b/,
      title: 'DevOps Engineer',
      skills: ['Docker', 'CI/CD', 'AWS', 'Python', 'Git', 'Automated testing']
    }
  ];
  const role = roles.find(candidate => candidate.match.test(path));
  if (!role) return null;

  const required = role.skills.filter(skill => !['Docker', 'AWS'].includes(skill)).join(', ');
  const preferred = role.skills.filter(skill => ['Docker', 'AWS'].includes(skill)).join(', ');
  return {
    title: role.title,
    company: 'Not detected from URL',
    description: `Required: ${required}\nPreferred: ${preferred}`,
    analysisNote: 'Role and skills are inferred from words in the URL. Review and edit the suggested skills before assessment.'
  };
}

async function fetchJobPosting(rawUrl) {
  let target = await resolvePublicUrl(rawUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await requestPage(target);
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      if (redirects === MAX_REDIRECTS) throw fail('The job-posting URL redirected too many times.');
      let redirectUrl;
      try {
        redirectUrl = new URL(response.headers.location, target.url).toString();
      } catch {
        throw fail('The job-posting page redirected to an invalid URL.');
      }
      target = await resolvePublicUrl(redirectUrl);
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw fail('This job-posting page could not be read. It may require sign-in or block automated access.');
    }
    const contentType = response.headers['content-type'] || '';
    if (!/text\/html|application\/xhtml\+xml|text\/plain|application\/ld\+json/i.test(contentType)) {
      throw fail('This URL did not return a readable job-posting page.');
    }
    const posting = parseJobPage(response.body);
    if (posting.description.length < 30) {
      throw fail('Could not extract job details from this page. It may require sign-in or block automated access.');
    }
    return posting;
  }
  throw fail('The job-posting URL could not be opened.');
}

module.exports = { fetchJobPosting, parseJobPage, inferJobFromUrl, isPublicAddress };
