from fpdf import FPDF
import os

BG = (8, 15, 24)           # #080f18
PRIMARY = (54, 166, 186)   # #36a6ba
ACCENT = (0, 229, 255)     # #00e5ff
BODY = (230, 235, 240)
MUTED = (140, 160, 180)

class SonarPDF(FPDF):
    def header(self):
        self.set_fill_color(*BG)
        self.rect(0, 0, 210, 297, 'F')

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(*MUTED)
        self.cell(0, 10, 'sonartracker.io', align='C')


def generate():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(base, 'public', 'logo2.png')
    output_path = os.path.join(base, 'SONAR_INFO_ES.pdf')

    pdf = SonarPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=False)

    # Logo centered at top
    logo_w = 70
    logo_x = (210 - logo_w) / 2
    pdf.image(logo_path, x=logo_x, y=18, w=logo_w)

    # Accent line under logo
    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(0.5)
    y_line = 42
    pdf.line(40, y_line, 170, y_line)

    # Title
    pdf.set_y(48)
    pdf.set_font('Helvetica', 'B', 22)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 12, 'Sonar Tracker', align='C', new_x="LMARGIN", new_y="NEXT")

    # Subtitle
    pdf.set_font('Helvetica', '', 10)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 6, 'Whale Intelligence for Every Trader', align='C', new_x="LMARGIN", new_y="NEXT")

    pdf.ln(8)

    # Section 1 heading
    pdf.set_x(20)
    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(0, 8, u'>  \u00bfQu\u00e9 es Sonar?', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    # Paragraph 1
    pdf.set_font('Helvetica', '', 10.5)
    pdf.set_text_color(*BODY)
    p1 = (
        "Sonar es una plataforma de inteligencia crypto que hace transparente lo que antes solo "
        "estaba al alcance de fondos de inversi\u00f3n y traders institucionales. Rastreamos en tiempo "
        "real los movimientos de las wallets m\u00e1s grandes del mercado - conocidas como \"whales\" "
        "- en las principales blockchains como Ethereum, Bitcoin, Solana y Polygon. Nuestra "
        "plataforma ofrece dashboards avanzados con datos de mercado, alertas personalizadas, "
        "analisis de sentimiento social y herramientas de seguimiento de carteras, todo presentado "
        "de forma clara y accesible para que cualquier trader pueda tomar decisiones informadas "
        "con la misma calidad de datos que manejan los profesionales."
    )
    pdf.set_x(20)
    pdf.multi_cell(170, 6, p1, align='J')

    pdf.ln(8)

    # Section 2 heading
    pdf.set_x(20)
    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(0, 8, u'>  Objetivos y Visi\u00f3n de Futuro', new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    # Paragraph 2
    pdf.set_font('Helvetica', '', 10.5)
    pdf.set_text_color(*BODY)
    p2 = (
        "Nuestro objetivo a futuro es convertirnos en la referencia global de an\u00e1lisis crypto "
        "impulsado por inteligencia artificial. Estamos desarrollando ORCA, nuestro asistente de "
        "IA entrenado con datos propietarios y an\u00e1lisis exclusivos de Sonar, dise\u00f1ado para ofrecer "
        "an\u00e1lisis de grado institucional - el mismo nivel que un hedge fund - pero accesible para "
        "todos. La visi\u00f3n es clara: democratizar la inteligencia financiera en crypto, combinando "
        "transparencia de datos on-chain con IA avanzada para que cada trader, sin importar su nivel, "
        "tenga las herramientas necesarias para competir en igualdad de condiciones."

    )
    pdf.set_x(20)
    pdf.multi_cell(170, 6, p2, align='J')

    pdf.ln(8)

    # Pitch deck note
    pdf.set_x(20)
    pdf.set_font('Helvetica', 'I', 10)
    pdf.set_text_color(*MUTED)
    pdf.cell(170, 6, 'Adjunto tambi\u00e9n el pitch deck con m\u00e1s detalles sobre el producto y la hoja de ruta.', align='C')

    pdf.ln(14)

    # Bottom accent line
    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(0.5)
    pdf.line(40, pdf.get_y(), 170, pdf.get_y())

    pdf.ln(6)

    # Website link
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 8, 'sonartracker.io', align='C', link='https://sonartracker.io')

    pdf.output(output_path)
    print(f"PDF generated: {output_path}")


if __name__ == '__main__':
    generate()
