/*
 * Copyright 2015-2016 Imply Data, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { AppSettings, Timekeeper } from '../common/models/index';

export interface ViewOptions {
  version: string;
  title: string;
  user?: any;
  appSettings?: AppSettings;
  timekeeper?: Timekeeper;
  stateful?: boolean;
}

function favicon(options: ViewOptions): string {
  const { version, title } = options;
  return `
<link rel="apple-touch-icon" sizes="57x57" href="favicon/apple-touch-icon-57x57.png?v=${version}">
<link rel="apple-touch-icon" sizes="60x60" href="favicon/apple-touch-icon-60x60.png?v=${version}">
<link rel="apple-touch-icon" sizes="72x72" href="favicon/apple-touch-icon-72x72.png?v=${version}">
<link rel="apple-touch-icon" sizes="76x76" href="favicon/apple-touch-icon-76x76.png?v=${version}">
<link rel="apple-touch-icon" sizes="114x114" href="favicon/apple-touch-icon-114x114.png?v=${version}">
<link rel="apple-touch-icon" sizes="120x120" href="favicon/apple-touch-icon-120x120.png?v=${version}">
<link rel="apple-touch-icon" sizes="144x144" href="favicon/apple-touch-icon-144x144.png?v=${version}">
<link rel="apple-touch-icon" sizes="152x152" href="favicon/apple-touch-icon-152x152.png?v=${version}">
<link rel="apple-touch-icon" sizes="180x180" href="favicon/apple-touch-icon-180x180.png?v=${version}">
<link rel="icon" type="image/png" href="favicon/favicon-32x32.png?v=${version}" sizes="32x32">
<link rel="icon" type="image/png" href="favicon/android-chrome-192x192.png?v=${version}" sizes="192x192">
<link rel="icon" type="image/png" href="favicon/favicon-96x96.png?v=${version}" sizes="96x96">
<link rel="icon" type="image/png" href="favicon/favicon-16x16.png?v=${version}" sizes="16x16">
<link rel="manifest" href="favicon/manifest.json?v=${version}">
<link rel="mask-icon" href="favicon/safari-pinned-tab.svg?v=${version}" color="#5bbad5">
<link rel="shortcut icon" href="favicon/favicon.ico?v=${version}">
<meta name="apple-mobile-web-app-title" content="${title}">
<meta name="application-name" content="${title}">
<meta name="msapplication-TileColor" content="#0093E2">
<meta name="msapplication-TileImage" content="favicon/mstile-144x144.png?v=${version}">
<meta name="msapplication-config" content="favicon/browserconfig.xml?v=${version}">
<meta name="theme-color" content="#ffffff">
`;
}

export function layout(options: ViewOptions, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="description" content="Data Explorer">
  <meta name="author" content="Imply">
  <meta name="google" value="notranslate">
  ${favicon(options)}
  <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1">
  <title>${options.title}</title>
</head>
<body>
${content}
</body>
</html>
`;
  }

export function pivotLayout(options: ViewOptions): string {
  const { version, user, appSettings, timekeeper, stateful } = options;
  return layout(options, `<div class="app-container"></div>
<script>var __CONFIG__ = ${JSON.stringify({ version, user, appSettings, timekeeper, stateful })};</script>
<script charset="UTF-8" src="pivot.js?v=${version}"></script>`
  );
}

export function errorLayout(options: ViewOptions, message: string, error: any = {}): string {
  return layout(options, `<h1>{{message}}</h1>
<h2>{{error.status}}</h2>
<pre>{{error.stack}}</pre>`
  );
}
