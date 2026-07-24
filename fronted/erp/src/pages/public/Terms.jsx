import { Link } from "react-router-dom";

export default function Terms() {
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
                    <h1 className="text-3xl font-extrabold text-[#111518] mb-2">Términos y Condiciones</h1>
                    <p className="text-[#60778a] mb-8">Última actualización: 27 de enero de 2026</p>

                    <div className="prose prose-lg max-w-none text-[#111518]">
                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">1. INFORMACIÓN GENERAL</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                Los presentes Términos y Condiciones (en adelante, "Términos") regulan el uso del sitio web
                                <strong> gpo-ar.web.app</strong> (en adelante, el "Sitio") y los servicios ofrecidos por
                                <strong> Grupo AR Construcción y Diseño</strong> (en adelante, "Grupo AR", "nosotros" o "la Empresa"),
                                con domicilio en Aguascalientes, Aguascalientes, México.
                            </p>
                            <p className="text-[#60778a] leading-relaxed">
                                Al acceder, navegar o utilizar este Sitio, el usuario (en adelante, "el Usuario" o "usted")
                                acepta de manera expresa e inequívoca quedar vinculado por estos Términos, así como por
                                nuestro Aviso de Privacidad. Si no está de acuerdo con alguno de estos términos,
                                le solicitamos abstenerse de utilizar el Sitio.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">2. SERVICIOS OFRECIDOS</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                Grupo AR ofrece los siguientes servicios, sujetos a disponibilidad y condiciones particulares:
                            </p>
                            <ul className="list-disc pl-6 text-[#60778a] space-y-2">
                                <li>Diseño arquitectónico y estructural</li>
                                <li>Obra civil y cimentaciones</li>
                                <li>Fabricación, montaje y soldadura de estructuras metálicas</li>
                                <li>Soldadura y pailería industrial</li>
                                <li>Servicios de titanes, grúas e izaje</li>
                                <li>Instalaciones eléctricas industriales y automatización</li>
                                <li>Renta de maquinaria y equipo pesado</li>
                                <li>Fabricación de mobiliario en acero inoxidable grado alimenticio</li>
                                <li>Remodelación, ampliaciones y mantenimiento industrial</li>
                                <li>Ferretería y venta de materiales de construcción</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">3. COTIZACIONES Y PRECIOS</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>3.1. Naturaleza de las cotizaciones:</strong> Las cotizaciones generadas a través del
                                Sitio o proporcionadas por nuestro personal tienen carácter informativo y no constituyen
                                una oferta vinculante. Los precios y condiciones están sujetos a cambios sin previo aviso.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>3.2. Vigencia:</strong> Salvo que se indique lo contrario, las cotizaciones tendrán
                                una vigencia de quince (15) días naturales a partir de su emisión.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>3.3. Precios:</strong> Los precios expresados pueden o no incluir el Impuesto al
                                Valor Agregado (IVA), lo cual se especificará en cada cotización. Cualquier impuesto
                                adicional aplicable será responsabilidad del Usuario conforme a la legislación mexicana vigente.
                            </p>
                            <p className="text-[#60778a] leading-relaxed">
                                <strong>3.4. Modificaciones:</strong> Grupo AR se reserva el derecho de modificar los
                                precios en cualquier momento, sin que ello afecte los contratos o cotizaciones ya formalizados.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">4. CONTRATACIÓN DE SERVICIOS</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>4.1. Formalización:</strong> La contratación de servicios se formalizará mediante
                                la firma de un contrato específico que detalle alcance, plazos, costos y condiciones
                                particulares del proyecto.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>4.2. Anticipos:</strong> Dependiendo del proyecto, se podrá requerir un anticipo
                                que oscile entre el 30% y 50% del monto total, el cual se especificará en el contrato
                                correspondiente.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>4.3. Pagos:</strong> Los pagos subsecuentes se realizarán conforme a los avances
                                de obra o entrega de productos/servicios, según se pacte en el contrato.
                            </p>
                            <p className="text-[#60778a] leading-relaxed">
                                <strong>4.4. Formas de pago:</strong> Aceptamos transferencia bancaria, depósito en
                                efectivo y, en casos específicos, pagos con tarjeta de crédito o débito.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">5. GARANTÍAS</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>5.1. Garantía de mano de obra:</strong> Grupo AR garantiza la calidad de su mano
                                de obra por un período de doce (12) meses a partir de la entrega formal del proyecto,
                                salvo que se especifique un plazo diferente en el contrato.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>5.2. Garantía de materiales:</strong> Los materiales utilizados contarán con la
                                garantía propia del fabricante, la cual será transferida al Usuario cuando corresponda.
                            </p>
                            <p className="text-[#60778a] leading-relaxed">
                                <strong>5.3. Exclusiones:</strong> La garantía no cubrirá daños causados por mal uso,
                                falta de mantenimiento, modificaciones realizadas por terceros, desastres naturales,
                                o cualquier circunstancia que no sea atribuible a Grupo AR.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">6. RESPONSABILIDADES Y LIMITACIONES</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>6.1. Del Usuario:</strong> El Usuario se compromete a proporcionar información
                                veraz y completa, facilitar el acceso a las instalaciones donde se realizarán los
                                trabajos, y cumplir con las condiciones de pago acordadas.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>6.2. De Grupo AR:</strong> Nos comprometemos a ejecutar los trabajos con
                                profesionalismo, cumpliendo las normas técnicas aplicables (NOM, OSHA, ANSI, ASME)
                                y respetando los plazos acordados, salvo causas de fuerza mayor.
                            </p>
                            <p className="text-[#60778a] leading-relaxed">
                                <strong>6.3. Limitación de responsabilidad:</strong> En ningún caso la responsabilidad
                                de Grupo AR excederá el monto total contratado. No seremos responsables por daños
                                indirectos, incidentales, especiales o consecuentes.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">7. PROPIEDAD INTELECTUAL</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>7.1. Contenido del Sitio:</strong> Todo el contenido del Sitio, incluyendo
                                textos, gráficos, logotipos, imágenes y software, es propiedad de Grupo AR o de sus
                                licenciantes y está protegido por las leyes de propiedad intelectual de México.
                            </p>
                            <p className="text-[#60778a] leading-relaxed">
                                <strong>7.2. Uso permitido:</strong> Se permite únicamente el uso personal y no
                                comercial del contenido. Queda prohibida la reproducción, distribución o modificación
                                sin autorización expresa por escrito.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">8. CANCELACIONES Y DEVOLUCIONES</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>8.1. Cancelación por el Usuario:</strong> El Usuario podrá cancelar el servicio
                                contratado antes del inicio de los trabajos, sujeto a una penalización del 20% del
                                anticipo como gastos administrativos.
                            </p>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>8.2. Cancelación durante ejecución:</strong> Si la cancelación ocurre una vez
                                iniciados los trabajos, se realizará un avalúo de los trabajos realizados y materiales
                                utilizados, siendo estos costos responsabilidad del Usuario.
                            </p>
                            <p className="text-[#60778a] leading-relaxed">
                                <strong>8.3. Productos:</strong> Respecto a la venta de productos de ferretería,
                                aplican las disposiciones de la Ley Federal de Protección al Consumidor.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">9. RELACIÓN LABORAL</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                La contratación de servicios de Grupo AR no genera relación laboral alguna entre el
                                Usuario y el personal de Grupo AR. Somos un prestador de servicios independiente y
                                nos hacemos responsables de las obligaciones laborales de nuestro personal conforme
                                a la Ley Federal del Trabajo.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">10. LEY APLICABLE Y JURISDICCIÓN</h2>
                            <p className="mb-4 text-[#60778a] leading-relaxed">
                                <strong>10.1.</strong> Estos Términos se regirán e interpretarán de acuerdo con las
                                leyes de los Estados Unidos Mexicanos.
                            </p>
                            <p className="text-[#60778a] leading-relaxed">
                                <strong>10.2.</strong> Para cualquier controversia derivada de estos Términos o de
                                la relación comercial, las partes se someten expresamente a la jurisdicción de los
                                tribunales competentes de la ciudad de Salamanca, Guanajuato, México,
                                renunciando a cualquier otro fuero que pudiera corresponderles.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">11. MODIFICACIONES</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Grupo AR se reserva el derecho de modificar estos Términos en cualquier momento.
                                Las modificaciones serán efectivas inmediatamente después de su publicación en el
                                Sitio. El uso continuado del Sitio después de cualquier modificación constituye la
                                aceptación de los nuevos Términos.
                            </p>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">12. CONTACTO</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Para cualquier duda, comentario o aclaración sobre estos Términos, puede contactarnos:
                            </p>
                            <ul className="list-none mt-4 text-[#60778a] space-y-2">
                                <li><strong>Email:</strong> grupo.ar.cyd@gmail.com</li>
                                <li><strong>Teléfono:</strong> 464 139 0122</li>
                                <li><strong>Dirección:</strong> Salamanca, Guanajuato, México</li>
                            </ul>
                        </section>

                        <section className="mb-8">
                            <h2 className="text-xl font-bold mb-4">13. ACEPTACIÓN</h2>
                            <p className="text-[#60778a] leading-relaxed">
                                Al utilizar este Sitio o contratar nuestros servicios, el Usuario declara haber leído,
                                entendido y aceptado los presentes Términos y Condiciones en su totalidad.
                            </p>
                        </section>
                    </div>

                    {/* Links */}
                    <div className="mt-12 pt-8 border-t border-[#e5e7eb] flex flex-wrap gap-4">
                        <Link to="/privacidad" className="text-[#0066cc] font-medium hover:underline">Ver Aviso de Privacidad →</Link>
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
