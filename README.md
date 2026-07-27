# FreelanceWeb - Eduardo Romero

Sitio web personal de portafolio freelance con formulario de contacto funcional y enlace a WhatsApp.

## Stack

- HTML, CSS, JavaScript (vanilla)
- Netlify (hosting + serverless functions)
- Resend (envío de correos)

## Estructura

```
freelanceWeb/
├── index.html                 # Página principal
├── nosotros.html              # Página sobre nosotros
├── css/
│   ├── normalize.css
│   └── styles.css
├── js/
│   └── main.js                # Manejo del formulario
├── netlify/
│   └── functions/
│       └── send-email.js      # Función serverless (envío de correos)
├── netlify.toml               # Configuración de Netlify
├── package.json
└── .env.example               # Template de variables de entorno
```

## Variables de entorno

Configurar en **Netlify Dashboard → Site settings → Environment variables**:

| Variable | Descripción |
|----------|-------------|
| `RESEND_API_KEY` | API key de [Resend](https://resend.com) |
| `CONTACT_EMAIL` | Correo destino donde se reciben los mensajes |

## Desarrollo local

```bash
npm install
netlify dev
```

## Despliegue

```bash
git push origin master
```

Netlify despliega automáticamente al detectar el push.

## Funcionalidades

- Formulario de contacto con validación y feedback visual
- Botón flotante de WhatsApp (esquina inferior derecha)
- Diseño responsive
- Cambio a modo oscuro

## Licencia

© 2025 Eduardo Romero - Freelancer Web Dev
