export const forgotPasswordTemplate = (name: string, code: string) =>
  template(`
  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 24px;
                        line-height: 1.3;
                        font-weight: 700;
                        padding-bottom: 8px;
                        text-align: left;
                      "
                    >
                      ¡Hola, ${name}!
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 16px;
                        line-height: 1.6;
                        padding-bottom: 20px;
                        text-align: left;
                      "
                    >
                      Para resetear tu contraseña, por favor ingresa el siguiente código de verificación en la aplicación:
                    </td>
                  </tr>

                  <!-- Botón -->
                  <tr>
                    <td align="center" style="padding-bottom: 20px">
                      
                      <div
                        target="_blank"
                        style="
                          background-color: #ffffff;
                          border: 1px solid #d9d9d9;
                          border-radius: 8px;
                          color: #4b4b4b;
                          display: inline-block;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 25px;
                          font-weight: 700;
                          line-height: 48px;
                          text-align: center;
                          text-decoration: none;
                          width: 320px;
                        "
                      >
                        ${code}
                      </div>
                    </td>
                  </tr>
`);

export const registerTemplate = (code: string) =>
  template(`
  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 24px;
                        line-height: 1.3;
                        font-weight: 700;
                        padding-bottom: 8px;
                        text-align: left;
                      "
                    >
                      ¡Hola!
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 16px;
                        line-height: 1.6;
                        padding-bottom: 20px;
                        text-align: left;
                      "
                    >
                      Casi tienes tu Pasta en el bolsillo. Solo falta este código en la app para validar tu correo:
                    </td>
                  </tr>

                  <!-- Botón -->
                  <tr>
                    <td align="center" style="padding-bottom: 20px">
                      
                      <div
                        target="_blank"
                        style="
                          background-color: #ffffff;
                          border: 1px solid #d9d9d9;
                          border-radius: 8px;
                          color: #4b4b4b;
                          display: inline-block;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 25px;
                          font-weight: 700;
                          line-height: 48px;
                          text-align: center;
                          text-decoration: none;
                          width: 320px;
                        "
                      >
                        ${code}
                      </div>
                    </td>
                  </tr>
`);

export const registerAdminTemplate = (url: string) =>
  template(`
  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 24px;
                        line-height: 1.3;
                        font-weight: 700;
                        padding-bottom: 8px;
                        text-align: left;
                      "
                    >
                      ¡Hola!
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 16px;
                        line-height: 1.6;
                        padding-bottom: 20px;
                        text-align: left;
                      "
                    >
                      Para completar tu registro en el administrador, por favor haz click en el siguiente enlace:
                    </td>
                  </tr>

                  <!-- Botón -->
                  <tr>
                    <td align="center" style="padding-bottom: 20px">
                      
                      <a
                        href="${url}"
                        target="_blank"
                        style="
                          background-color: #ffffff;
                          border: 1px solid #d9d9d9;
                          border-radius: 8px;
                          color: #4b4b4b;
                          display: inline-block;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 18px;
                          font-weight: 700;
                          line-height: 48px;
                          text-align: center;
                          text-decoration: none;
                          width: 320px;
                        "
                      >
                        Completar registro
                      </a>
                    </td>
                  </tr>
`);

export const forgotPasswordAdminTemplate = (url: string) =>
  template(`
  <span class="v14_1932">¡Hola!</span>
  <span class="v14_1933">Para reestablecer tu contraseña en el administrador, por favor haz click en el siguiente enlace:</span>
  <div class="v14_1934" style="width: 100%; text-align: center;">
    <a target="_blank" href="${url}">
      <span class="v14_1935"></span>
    </a>
  </div>
  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 24px;
                        line-height: 1.3;
                        font-weight: 700;
                        padding-bottom: 8px;
                        text-align: left;
                      "
                    >
                      ¡Hola!
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 16px;
                        line-height: 1.6;
                        padding-bottom: 20px;
                        text-align: left;
                      "
                    >
                      Para reestablecer tu contraseña en el administrador, por favor haz click en el siguiente enlace:
                    </td>
                  </tr>

                  <!-- Botón -->
                  <tr>
                    <td align="center" style="padding-bottom: 20px">
                      
                      <a
                        href="${url}"
                        target="_blank"
                        style="
                          background-color: #ffffff;
                          border: 1px solid #d9d9d9;
                          border-radius: 8px;
                          color: #4b4b4b;
                          display: inline-block;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 18px;
                          font-weight: 700;
                          line-height: 48px;
                          text-align: center;
                          text-decoration: none;
                          width: 320px;
                        "
                      >
                        Restablecer contraseña
                      </a>
                    </td>
                  </tr>
`);

export const changePasswordTemplate = (name: string, code: string) =>
  template(`
  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 24px;
                        line-height: 1.3;
                        font-weight: 700;
                        padding-bottom: 8px;
                        text-align: left;
                      "
                    >
                      ¡Hola, ${name}!
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 16px;
                        line-height: 1.6;
                        padding-bottom: 20px;
                        text-align: left;
                      "
                    >
                      Para cambiar tu contraseña, por favor ingresa el siguiente código de verificación en la aplicación:
                    </td>
                  </tr>

                  <!-- Botón -->
                  <tr>
                    <td align="center" style="padding-bottom: 20px">
                      
                      <div
                        target="_blank"
                        style="
                          background-color: #ffffff;
                          border: 1px solid #d9d9d9;
                          border-radius: 8px;
                          color: #4b4b4b;
                          display: inline-block;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 25px;
                          font-weight: 700;
                          line-height: 48px;
                          text-align: center;
                          text-decoration: none;
                          width: 320px;
                        "
                      >
                        ${code}
                      </div>
                    </td>
                  </tr>
`);

export const editProfileTemplate = (name: string, code: string) =>
  template(` 
  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 24px;
                        line-height: 1.3;
                        font-weight: 700;
                        padding-bottom: 8px;
                        text-align: left;
                      "
                    >
                      ¡Hola, ${name}!
                    </td>
                  </tr>
                  <tr>
                    <td
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        color: #4b4b4b;
                        font-size: 16px;
                        line-height: 1.6;
                        padding-bottom: 20px;
                        text-align: left;
                      "
                    >
                      Para modificar tu perfil, por favor ingresa el siguiente código de verificación en la aplicación:
                    </td>
                  </tr>

                  <!-- Botón -->
                  <tr>
                    <td align="center" style="padding-bottom: 20px">
                      
                      <div
                        target="_blank"
                        style="
                          background-color: #ffffff;
                          border: 1px solid #d9d9d9;
                          border-radius: 8px;
                          color: #4b4b4b;
                          display: inline-block;
                          font-family: Arial, Helvetica, sans-serif;
                          font-size: 25px;
                          font-weight: 700;
                          line-height: 48px;
                          text-align: center;
                          text-decoration: none;
                          width: 320px;
                        "
                      >
                        ${code}
                      </div>
                    </td>
                  </tr>
`);

export const template = (children: string) => `
<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1"
    />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Restablecer contraseña</title>

    <style>
      .preheader {
        display: none !important;
        visibility: hidden;
        opacity: 0;
        color: transparent;
        height: 0;
        width: 0;
        overflow: hidden;
        mso-hide: all;
      }

      @media only screen and (max-width: 600px) {
        .container {
          width: 100% !important;
          max-width: 100% !important;
        }
        .responsive-img {
          width: 100% !important;
          height: auto !important;
        }
        .p-16 {
          padding: 16px !important;
        }
        .btn a {
          display: block !important;
          padding: 14px 18px !important;
          font-size: 16px !important;
        }
      }
    </style>

    <!--[if mso]>
      <style type="text/css">
        body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
      </style>
    <![endif]-->
  </head>

  <body
    style="
      margin: 0;
      padding: 0;
      width: 100% !important;
      background-color: #ffffff;
    "
  >

    <!-- Wrapper -->
    <table
      role="presentation"
      cellpadding="0"
      cellspacing="0"
      border="0"
      width="100%"
      style="background-color: #ffffff; margin: 0; padding: 0"
    >
      <tr>
        <td align="center" style="padding: 24px">
          <!-- Container -->
          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            border="0"
            width="600"
            class="container"
            style="
              width: 600px;
              max-width: 600px;
              background-color: #f2f2f2;
              border-radius: 10px;
              overflow: hidden;
            "
          >
            <!-- Header/logo -->
            <tr>
              <td align="center" style="padding: 24px 24px 0 24px">
                <img
                  src="https://api.pidepasta.com/public/img/logo_pasta.png"
                  width="120"
                  height="auto"
                  alt="Pasta"
                  style="
                    display: block;
                    border: 0;
                    outline: 0;
                    text-decoration: none;
                    height: auto;
                  "
                />
              </td>
            </tr>

            <!-- Hero image -->
            <tr>
              <td align="center" style="padding: 16px 24px 0 24px">
                <img
                  src="https://api.pidepasta.com/public/img/email-img.png"
                  width="552"
                  alt="Restablece tu contraseña"
                  class="responsive-img"
                  style="
                    display: block;
                    border: 0;
                    outline: 0;
                    text-decoration: none;
                    width: 100%;
                    max-width: 300px;
                    height: auto;
                    border-radius: 8px;
                  "
                />
              </td>
            </tr>

            <!-- Card body -->
            <tr>
              <td style="padding: 24px" class="p-16">
                <table
                  role="presentation"
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  class="card"
                  style="border-collapse: collapse"
                >
                  ${children}

                  <!-- Línea separadora -->
                  <tr>
                    <td style="padding-top: 24px; padding-bottom: 8px">
                      <table
                        role="presentation"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                      >
                        <tr>
                          <td
                            style="
                              border-top: 1px solid #cfcfcf;
                              font-size: 0;
                              line-height: 0;
                            "
                          >
                            &nbsp;
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding-top: 8px">
                      <table
                        role="presentation"
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        border="0"
                      >
                        <tr>
                          <td
                            style="
                              font-family: Arial, Helvetica, sans-serif;
                              color: #4b4b4b;
                              font-size: 14px;
                              line-height: 1.4;
                            "
                          >
                            Enviado por Pasta.app
                          </td>
                          <td align="right">
                            <span
                              style="
                                font-family: Arial, Helvetica, sans-serif;
                                color: #4b4b4b;
                                font-size: 14px;
                                line-height: 1.4;
                              "
                              >Síguenos en:</span
                            >
                            <a
                              href="https://instagram.com/pasta_app"
                              target="_blank"
                              style="text-decoration: none; margin-left: 8px"
                            >
                              <img
                                src="https://api.pidepasta.com/public/img/instagram.png"
                                width="20"
                                height="20"
                                alt="Instagram"
                                style="
                                  display: inline-block;
                                  border: 0;
                                  outline: 0;
                                  text-decoration: none;
                                  vertical-align: middle;
                                "
                              />
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Legal -->
            <tr>
              <td align="center" style="padding: 0 24px 24px 24px">
                <p
                  style="
                    margin: 0;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #959595;
                    font-size: 11px;
                    line-height: 1.6;
                    text-align: center;
                  "
                >
                  Recibes este correo electrónico porque te registraste en
                  Pasta. © Pasta. 2025. Todos los derechos reservados.
                </p>
              </td>
            </tr>
          </table>

          <!-- Nota inferior -->
          <table
            role="presentation"
            cellpadding="0"
            cellspacing="0"
            border="0"
            width="600"
            class="container"
            style="width: 600px; max-width: 600px; margin-top: 12px"
          >
            <tr>
              <td
                align="center"
                style="
                  font-family: Arial, Helvetica, sans-serif;
                  color: #b5b5b5;
                  font-size: 10px;
                "
              >
                Si no solicitaste este cambio, puedes ignorar este mensaje.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
