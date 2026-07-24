import { Link } from "react-router-dom";

export default function Privacy() {
    return (
        <div className="min-h-screen bg-[#f8fafc] font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Header */}
            <header className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="logo-circle w-10 h-10">
                            <img src="/assets/logo.png" alt="Grupo AR" />
                        </div>
                        <span className="font-bold text-[#111518]">Grupo AR</span>
                    </Link>
                    <Link to="/" className="text-sm text-[#0066cc] font-medium hover:underline">← Volver al Inicio</Link>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-2xl border border-[#e5e7eb] p-8 md:p-12 shadow-sm">
                    <h1 className="text-3xl font-extrabold text-[#111518] mb-2">Aviso de Privacidad</h1>
                    <p className="text-[#60778a] mb-8">Última actualización: 27 de enero de 2026</p>

                    <div className="prose prose-lg max-w-none text-[#111518]">
                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">I. IDENTIDAD Y DOMICILIO DEL RESPONSABLE</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                <strong>Grupo AR Construcción y Diseño</strong> (en adelante, "Grupo AR", "nosotros" o
                                "el Responsable"), con domicilio en Aguascalientes, Aguascalientes, México, es responsable
                                del tratamiento de los datos personales que nos proporcione, los cuales serán protegidos
                                conforme a lo dispuesto por la Ley Federal de Protección de Datos Personales en Posesión
                                de los Particulares (LFPDPPP), su Reglamento y demás normatividad aplicable.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">II. DATOS PERSONALES RECABADOS</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                Para llevar a cabo las finalidades descritas en el presente Aviso de Privacidad,
                                podemos recabar las siguientes categorías de datos personales:
                            </p>

                            <h3 className="text-lg font-semibold mb-3 mt-6">A. Datos de Identificación:</h3>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-1 mb-4">
                                <li>Nombre completo</li>
                                <li>Razón social (en caso de personas morales)</li>
                                <li>Registro Federal de Contribuyentes (RFC)</li>
                                <li>Clave Única de Registro de Población (CURP)</li>
                                <li>Identificación oficial</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3">B. Datos de Contacto:</h3>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-1 mb-4">
                                <li>Domicilio particular o fiscal</li>
                                <li>Correo electrónico</li>
                                <li>Número telefónico fijo y/o móvil</li>
                                <li>Nombre de usuario en redes sociales o mensajería (WhatsApp)</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3">C. Datos Laborales (para empleados y colaboradores):</h3>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-1 mb-4">
                                <li>Puesto y departamento</li>
                                <li>Historial laboral</li>
                                <li>Número de Seguro Social (NSS)</li>
                                <li>Datos bancarios para nómina</li>
                                <li>Fotografía para gafete de identificación</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3">D. Datos Financieros (cuando aplique):</h3>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-1">
                                <li>Datos bancarios para transferencias</li>
                                <li>Historial crediticio (solo en casos de financiamiento)</li>
                                <li>Comprobantes de domicilio</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">III. DATOS PERSONALES SENSIBLES</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Le informamos que para cumplir con las finalidades previstas en este Aviso de Privacidad,
                                <strong> no recabamos datos personales considerados como sensibles</strong> de conformidad
                                con el artículo 3, fracción VI de la LFPDPPP. En caso de que en algún momento fuere
                                necesario, se solicitará su consentimiento expreso y por escrito de manera previa.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">IV. FINALIDADES DEL TRATAMIENTO</h2>

                            <h3 className="text-lg font-semibold mb-3 mt-6">A. Finalidades Primarias (necesarias para la relación jurídica):</h3>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-2 mb-4">
                                <li>Identificar y contactar al titular de los datos personales</li>
                                <li>Elaborar cotizaciones y presupuestos de servicios</li>
                                <li>Celebrar contratos de prestación de servicios</li>
                                <li>Facturación y cobranza de servicios</li>
                                <li>Cumplimiento de obligaciones fiscales y legales</li>
                                <li>Atención de solicitudes, quejas y reclamaciones</li>
                                <li>Gestión de expedientes de proyectos</li>
                                <li>Administración de recursos humanos (para empleados)</li>
                                <li>Verificación de identidad del personal mediante gafetes</li>
                            </ul>

                            <h3 className="text-lg font-semibold mb-3">B. Finalidades Secundarias:</h3>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-2">
                                <li>Envío de información promocional sobre nuestros servicios</li>
                                <li>Encuestas de satisfacción del cliente</li>
                                <li>Invitaciones a eventos empresariales</li>
                                <li>Estadísticas y análisis de mercado internos</li>
                                <li>Publicación de proyectos realizados en nuestro portafolio (con autorización)</li>
                            </ul>

                            <p className="mt-4 text-[#60778a] leading-relaxed bg-blue-50 p-4 rounded-lg">
                                <strong>Nota:</strong> Si usted no desea que sus datos personales sean tratados para las
                                finalidades secundarias, puede manifestarlo enviando un correo electrónico a
                                <strong> grupo.ar.cyd@gmail.com</strong> indicando su negativa.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">V. TRANSFERENCIA DE DATOS PERSONALES</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                Le informamos que sus datos personales pueden ser transferidos y tratados dentro y
                                fuera del país, a las siguientes categorías de terceros:
                            </p>
                            <table className="w-full border-collapse border border-[#e5e7eb] text-sm">
                                <thead>
                                    <tr className="bg-[#f8fafc]">
                                        <th className="border border-[#e5e7eb] p-3 text-left">Destinatario</th>
                                        <th className="border border-[#e5e7eb] p-3 text-left">Finalidad</th>
                                        <th className="border border-[#e5e7eb] p-3 text-left">Consentimiento</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[#60778a]">
                                    <tr>
                                        <td className="border border-[#e5e7eb] p-3">Autoridades fiscales (SAT)</td>
                                        <td className="border border-[#e5e7eb] p-3">Cumplimiento legal y fiscal</td>
                                        <td className="border border-[#e5e7eb] p-3">No requerido</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-[#e5e7eb] p-3">Instituciones bancarias</td>
                                        <td className="border border-[#e5e7eb] p-3">Procesamiento de pagos</td>
                                        <td className="border border-[#e5e7eb] p-3">No requerido</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-[#e5e7eb] p-3">Proveedores de servicios tecnológicos</td>
                                        <td className="border border-[#e5e7eb] p-3">Almacenamiento en la nube</td>
                                        <td className="border border-[#e5e7eb] p-3">No requerido</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-[#e5e7eb] p-3">IMSS, INFONAVIT</td>
                                        <td className="border border-[#e5e7eb] p-3">Obligaciones laborales</td>
                                        <td className="border border-[#e5e7eb] p-3">No requerido</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="mt-4 text-[#60778a] leading-relaxed">
                                En los casos donde el consentimiento no es requerido, la transferencia se realiza con
                                fundamento en el artículo 37 de la LFPDPPP.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">VI. DERECHOS ARCO</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                Conforme a la LFPDPPP, usted tiene derecho a conocer qué datos personales tenemos de
                                usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso).
                                Asimismo, es su derecho solicitar la corrección de su información personal en caso
                                de que esté desactualizada, sea inexacta o incompleta (Rectificación); que la
                                eliminemos de nuestros registros o bases de datos cuando considere que la misma no
                                está siendo utilizada adecuadamente (Cancelación); así como oponerse al uso de sus
                                datos personales para fines específicos (Oposición). Estos derechos se conocen como
                                derechos ARCO.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                Para el ejercicio de cualquiera de los derechos ARCO, usted deberá presentar la
                                solicitud respectiva a través de:
                            </p>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-2">
                                <li><strong>Correo electrónico:</strong> grupo.ar.cyd@gmail.com</li>
                                <li><strong>Personalmente:</strong> En nuestras oficinas ubicadas en Aguascalientes, Ags.</li>
                            </ul>
                            <p className="mt-4 text-[#60778a] leading-relaxed">
                                La solicitud deberá contener:
                            </p>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-1">
                                <li>Nombre completo y domicilio del titular</li>
                                <li>Copia de identificación oficial</li>
                                <li>Descripción clara y precisa de los datos personales respecto de los cuales se busca ejercer algún derecho</li>
                                <li>Cualquier otro elemento que facilite la localización de los datos</li>
                            </ul>
                            <p className="mt-4 text-[#60778a] leading-relaxed">
                                Grupo AR responderá en un plazo máximo de veinte (20) días hábiles, contados desde la
                                fecha en que se recibió la solicitud completa.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">VII. REVOCACIÓN DEL CONSENTIMIENTO</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                En cualquier momento, usted puede revocar el consentimiento que, en su caso, nos haya
                                otorgado para el tratamiento de sus datos personales. Sin embargo, es importante que
                                tenga en cuenta que no en todos los casos podremos atender su solicitud o concluir el
                                uso de forma inmediata, ya que es posible que por alguna obligación legal requiramos
                                seguir tratando sus datos personales. Para revocar su consentimiento deberá presentar
                                su solicitud a través de los medios señalados en la sección anterior.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">VIII. LIMITACIÓN DE USO Y DIVULGACIÓN</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Con objeto de que usted pueda limitar el uso y divulgación de su información personal,
                                le ofrecemos los siguientes mecanismos:
                            </p>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-2 mt-4">
                                <li>Inscripción en el Registro Público para Evitar Publicidad (REPEP) de la PROFECO</li>
                                <li>Envío de correo electrónico a grupo.ar.cyd@gmail.com solicitando la baja de comunicaciones comerciales</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">IX. USO DE COOKIES Y TECNOLOGÍAS DE RASTREO</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                Le informamos que en nuestro sitio web utilizamos cookies, web beacons y otras
                                tecnologías a través de las cuales es posible monitorear su comportamiento como
                                usuario de Internet, brindarle un mejor servicio y experiencia de usuario al navegar
                                en nuestra página, así como ofrecerle contenido personalizado.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>Tipos de cookies utilizadas:</strong>
                            </p>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-2">
                                <li><strong>Cookies esenciales:</strong> Necesarias para el funcionamiento del sitio</li>
                                <li><strong>Cookies de análisis:</strong> Nos permiten conocer cómo interactúan los usuarios con el sitio</li>
                                <li><strong>Cookies de preferencias:</strong> Permiten recordar sus preferencias de navegación</li>
                            </ul>
                            <p className="mt-4 text-[#60778a] leading-relaxed">
                                Puede deshabilitar el uso de cookies a través de la configuración de su navegador;
                                sin embargo, esto podría afectar su experiencia de navegación.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">X. MEDIDAS DE SEGURIDAD</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Grupo AR ha implementado medidas de seguridad administrativas, técnicas y físicas para
                                proteger sus datos personales contra daño, pérdida, alteración, destrucción o uso,
                                acceso o tratamiento no autorizado. Entre dichas medidas se encuentran:
                            </p>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-2 mt-4">
                                <li>Encriptación de datos sensibles</li>
                                <li>Controles de acceso a la información</li>
                                <li>Capacitación al personal en materia de protección de datos</li>
                                <li>Almacenamiento seguro en servidores certificados</li>
                                <li>Políticas internas de confidencialidad</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">XI. CAMBIOS AL AVISO DE PRIVACIDAD</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Nos reservamos el derecho de efectuar en cualquier momento modificaciones o
                                actualizaciones al presente Aviso de Privacidad, para la atención de novedades
                                legislativas, políticas internas o nuevos requerimientos para la prestación u
                                ofrecimiento de nuestros servicios. Estas modificaciones estarán disponibles al
                                público a través de nuestro sitio web <strong>gpo-ar.web.app</strong>.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">XII. AUTORIDAD COMPETENTE</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Si usted considera que su derecho de protección de datos personales ha sido lesionado
                                por alguna conducta de nuestros empleados o de nuestras actuaciones o respuestas,
                                presume que en el tratamiento de sus datos personales existe alguna violación a las
                                disposiciones previstas en la LFPDPPP, podrá interponer la queja o denuncia
                                correspondiente ante el Instituto Nacional de Transparencia, Acceso a la Información
                                y Protección de Datos Personales (INAI), para mayor información visite www.inai.org.mx
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">XIII. CONTACTO</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Para cualquier duda, comentario o ejercicio de derechos relacionados con este
                                Aviso de Privacidad, puede contactar al departamento de protección de datos de
                                Grupo AR:
                            </p>
                            <ul className="list-none mt-4 text-[#60778a] space-y-2">
                                <li><strong>Email:</strong> grupo.ar.cyd@gmail.com</li>
                                <li><strong>Teléfono:</strong> 464 139 0122</li>
                                <li><strong>Dirección:</strong> Salamanca, Guanajuato, México</li>
                                <li><strong>Horario de atención:</strong> Lunes a Viernes de 9:00 a 18:00 hrs</li>
                            </ul>
                        </section>

                        <section className="bg-[#f8fafc] p-6 rounded-xl">
                            <h2 className="text-xl font-bold mb-4">XIV. CONSENTIMIENTO</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Consiento que mis datos personales sean tratados de conformidad con los términos y
                                condiciones informados en el presente Aviso de Privacidad.
                            </p>
                            <p className="mt-4 text-sm text-[#60778a]">
                                Al utilizar nuestro sitio web, proporcionar sus datos a través de formularios de
                                contacto, cotizaciones, o contratar nuestros servicios, usted manifiesta su
                                consentimiento expreso para el tratamiento de sus datos personales conforme a lo
                                establecido en este Aviso de Privacidad.
                            </p>
                        </section>
                    </div>

                    {/* Links */}
                    <div className="mt-12 pt-8 border-t border-[#e5e7eb] flex flex-wrap gap-4">
                        <Link to="/terminos" className="text-[#0066cc] font-medium hover:underline">Ver Términos y Condiciones →</Link>
                        <Link to="/" className="text-[#60778a] hover:text-[#111518]">Volver al Inicio</Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-[#111518] text-white py-8 mt-12">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="logo-circle w-10 h-10"><img src="/assets/logo.png" alt="Grupo AR" /></div>
                        <span className="font-bold">Grupo AR</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 text-sm text-white/60">
                        <p>© 2026 Grupo AR. Todos los derechos reservados.</p>
                        <a href="https://zolvek-mx.web.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                            programado por ZOLVEK -- Francisco Lopez Velázquez
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
