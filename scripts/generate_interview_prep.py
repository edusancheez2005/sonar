from fpdf import FPDF
import os

BG = (8, 15, 24)
PRIMARY = (54, 166, 186)
ACCENT = (0, 229, 255)
BODY = (230, 235, 240)
MUTED = (140, 160, 180)
WHITE = (255, 255, 255)
HIGHLIGHT = (30, 45, 60)


class PrepPDF(FPDF):
    def header(self):
        self.set_fill_color(*BG)
        self.rect(0, 0, 210, 297, "F")

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}  |  Sonar - Interview Prep Guide", align="C")

    # ---- helpers ----
    def section_title(self, title):
        self.set_x(15)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*ACCENT)
        self.cell(0, 10, f">  {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*ACCENT)
        self.set_line_width(0.4)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(4)

    def sub_title(self, title):
        self.set_x(15)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*PRIMARY)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_x(15)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*BODY)
        self.multi_cell(180, 5.5, text, align="J")
        self.ln(3)

    def bullet(self, text):
        self.set_x(20)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*BODY)
        self.multi_cell(175, 5.5, f"-  {text}", align="L")
        self.ln(1)

    def qa_block(self, question, answer):
        self.set_x(15)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*PRIMARY)
        self.multi_cell(180, 5.5, f"Q: {question}", align="L")
        self.ln(1)
        self.set_x(15)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*BODY)
        self.multi_cell(180, 5.5, answer, align="J")
        self.ln(4)

    def tip_box(self, text):
        y_start = self.get_y()
        self.set_fill_color(*HIGHLIGHT)
        self.set_x(15)
        # measure height needed
        self.set_font("Helvetica", "I", 9.5)
        # use a clone approach: just render with fill
        self.set_text_color(*ACCENT)
        self.set_x(18)
        self.multi_cell(174, 5.5, f"TIP: {text}", align="L", fill=False)
        y_end = self.get_y()
        # draw filled rect behind
        self.set_fill_color(*HIGHLIGHT)
        self.rect(15, y_start - 1, 180, y_end - y_start + 3, "F")
        # re-render text on top
        self.set_y(y_start)
        self.set_x(18)
        self.set_text_color(*ACCENT)
        self.set_font("Helvetica", "I", 9.5)
        self.multi_cell(174, 5.5, f"TIP: {text}", align="L")
        self.ln(4)

    def safe_page_break(self, needed=60):
        if self.get_y() + needed > 270:
            self.add_page()


def generate():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    logo_path = os.path.join(base, "public", "logo2.png")
    output_path = os.path.join(base, "ACCELERATOR_INTERVIEW_PREP.pdf")

    pdf = PrepPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=25)

    # ============================
    # COVER PAGE
    # ============================
    pdf.add_page()
    pdf.set_auto_page_break(auto=False)

    if os.path.exists(logo_path):
        logo_w = 60
        logo_x = (210 - logo_w) / 2
        pdf.image(logo_path, x=logo_x, y=30, w=logo_w)

    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(0.5)
    pdf.line(40, 55, 170, 55)

    pdf.set_y(65)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 14, "King's Start-up Accelerator", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(0, 12, "Interview Prep Guide", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 8, "Eduardo Sanchez Morales  |  Sonar", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, "April 2026", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(10)
    pdf.set_draw_color(*ACCENT)
    pdf.line(40, pdf.get_y(), 170, pdf.get_y())

    pdf.ln(12)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*BODY)
    pdf.set_x(30)
    pdf.multi_cell(150, 6, (
        "This guide covers your 2-3 minute pitch script, prepared answers for "
        "Andrea's specific feedback questions, anticipated panel questions, and "
        "key metrics and talking points to keep front of mind."
    ), align="C")

    # ============================
    # PAGE 2: INTERVIEW FORMAT
    # ============================
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=25)

    pdf.section_title("Interview Format & Logistics")

    pdf.bullet("Virtual on MS Teams, 30 minutes sharp")
    pdf.bullet("Panel of 3: Andrea + ventures/incubations team member + external network member")
    pdf.bullet("2-3 min verbal pitch (NO slides) followed by Q&A")
    pdf.bullet("You can ask them questions at the end")
    pdf.bullet("They want to see: innovation, validation, and founder-market fit")
    pdf.bullet("Timeline: interviews 13-23 April, offers early May, welcome week 17-19 June")

    pdf.ln(2)
    pdf.tip_box(
        "The pitch brief asks for 4 things: Unmet Need, Your Solution, Competitive Advantage, "
        "and Team/Motivation. Structure your 2-3 min around these exact pillars."
    )

    # ============================
    # PAGE 3: THE PITCH SCRIPT
    # ============================
    pdf.safe_page_break(80)
    pdf.section_title("Your 2-3 Minute Pitch Script")
    pdf.body_text(
        "Below is a structured script hitting all four areas from the brief. "
        "Practice it out loud. Aim for 2 minutes 15 seconds to leave buffer. "
        "Speak naturally, don't memorise word for word, but nail the structure and key numbers."
    )

    pdf.sub_title("1. Unmet Need & Customer (30-40 sec)")
    pdf.body_text(
        "Crypto traders lose money every day, not because the market is random, but because "
        "the information they need is either too expensive, scattered across too many tools, or "
        "just unreliable. I lived this myself as a trader. I was constantly switching between Whale Alert "
        "for transaction data, LunarCrush for sentiment, CoinGecko for prices, and Twitter for news. "
        "I never had the full picture. When a whale moved $10 million of Ethereum to an exchange, "
        "I'd find out hours later. By then the price had already moved.\n\n"
        "Through Idea Factory I spoke with over 20 active traders and the pattern was clear. They're "
        "semi-experienced, 1 to 3 years in crypto, hold portfolios between 1K and 100K, and they're "
        "frustrated by fragmented tools. Nansen costs 150 a month. Dune requires SQL. Whale Alert "
        "gives raw data with zero context. No single platform brings it all together affordably."
    )

    pdf.safe_page_break(70)
    pdf.sub_title("2. The Solution (30-40 sec)")
    pdf.body_text(
        "That's why I built Sonar. It's an AI-powered crypto intelligence platform that combines "
        "whale tracking, multi-source sentiment analysis, news, and a conversational AI advisor "
        "called Orca, all in one place for 7.99 a month.\n\n"
        "We track real-time whale transactions above $500K across major blockchains, run a "
        "10-component sentiment algorithm fusing 6 data sources into a single confidence-scored "
        "rating, and let traders ask Orca natural language questions about any token. We're also "
        "developing a backtesting engine so traders can validate our signals against historical "
        "data before risking real money. And longer term, we're building towards a proprietary "
        "LLM trained on our own signal data and market history, essentially an AI quant analyst "
        "that gets smarter the more data we feed it."
    )

    pdf.safe_page_break(60)
    pdf.sub_title("3. Competitive Advantage (20-30 sec)")
    pdf.body_text(
        "No other platform combines whale tracking, sentiment, news, social intelligence, and "
        "an AI advisor at this price point. Our competitors solve pieces of the puzzle. Nansen does "
        "on-chain but charges 150 a month and has no AI. Arkham does blockchain intelligence but "
        "it's built for researchers, not everyday traders. LunarCrush does social but ignores whale "
        "activity entirely. Sonar is the only tool that gives traders the complete picture for under "
        "8 pounds a month. And our long-term moat is the proprietary LLM we're building, trained "
        "on our own accumulated signal data. Think of it like a hedge fund quant, but accessible "
        "to retail traders."
    )

    pdf.safe_page_break(60)
    pdf.sub_title("4. Team & Traction (20-30 sec)")
    pdf.body_text(
        "I'm a CS with Management student at King's with extensive AI experience, including an "
        "AI internship in the UAE. I built the entire platform from scratch. My co-founder Saif "
        "is a CS and Maths student, also at King's, and he leads our Bitcoin and Solana data "
        "engineering. Between us we cover full-stack, AI, and blockchain development without "
        "needing to hire.\n\n"
        "The product is live at sonartracker.io with over 650 users, and we grew 150 of those "
        "in just the last 2 weeks with zero marketing spend. We have 5 paying subscribers and "
        "Stripe is processing real payments. We deliberately made the free version more accessible "
        "to maximise the top of funnel, then we'll convert users to premium as they see the value. "
        "6 automated data pipelines run in production across 100+ tokens.\n\n"
        "The impact I want to make is simple: democratise access to institutional-grade crypto "
        "analytics. Right now the best tools are only available to people who can afford hundreds "
        "a month. Sonar makes that same data accessible to everyone."
    )

    pdf.ln(2)
    pdf.tip_box(
        "Aim for confident, conversational delivery. The panel wants a snapshot, not a sales pitch. "
        "End with traction numbers, they're your strongest proof point."
    )

    # ============================
    # ANDREA'S SPECIFIC QUESTIONS
    # ============================
    pdf.add_page()
    pdf.section_title("Answering Andrea's Specific Feedback")
    pdf.body_text(
        "These are the exact areas Andrea flagged in her email. The panel WILL ask about these. "
        "Have these answers locked in."
    )

    pdf.safe_page_break(80)
    pdf.qa_block(
        "Structured validation - what hypothesis are you testing and what metrics are you tracking?",
        "We're testing four core hypotheses right now. First, that combining multiple data sources "
        "into one composite score genuinely improves trading outcomes versus using individual tools. "
        "We're developing our backtesting engine specifically to test this, tracking hit rates and "
        "returns against buy-and-hold baselines. Second, that retail traders will pay 7.99 a month "
        "when free but fragmented alternatives exist. We deliberately made the free tier more "
        "accessible to grow the user base first, and we're measuring conversion rate as we start "
        "nudging users towards premium. We have 5 paying subscribers from 650+ users. Third, that "
        "an AI chat interface is the most valued feature. We track Orca AI conversations per user "
        "per week. Fourth, that users retain week over week. We track weekly active user retention. "
        "Since the application, I've become much more structured about logging these metrics and "
        "making decisions based on them rather than gut feel."
    )

    pdf.safe_page_break(80)
    pdf.qa_block(
        "The pricing gap: have you estimated the value of your product to users? Is the assumption "
        "that retail traders are priced out dependent on portfolio size?",
        "This is a really good challenge and I've thought about it more since the application. "
        "You're right that a trader with a 100K portfolio might happily pay 150 a month for Nansen "
        "if it helps them make even 1% better returns. The cost-to-portfolio ratio matters.\n\n"
        "But our research shows the sweet spot is traders with 1K to 50K portfolios, which is the "
        "vast majority of retail. For someone with a 5K portfolio, 150 a month is 3% of their entire "
        "holdings just on analytics, which makes no sense. At 7.99 that's 0.16%, which is very "
        "reasonable.\n\n"
        "That said, there is room for tiered pricing as we grow. A Pro tier at 19.99 or 29.99 for "
        "larger portfolio traders who want deeper analytics, API access, or higher AI usage limits. "
        "We intentionally started at 7.99 to maximise adoption and learn, but the pricing model "
        "will evolve as we understand willingness to pay at different portfolio sizes."
    )

    pdf.safe_page_break(80)
    pdf.qa_block(
        "Could Nansen develop a retail version and be a threat? How do you build a sustainable "
        "competitive advantage?",
        "Nansen absolutely could launch a cheaper tier, and I'd expect them to eventually. But there "
        "are a few reasons I think Sonar still wins in that scenario.\n\n"
        "First, Nansen's entire business model is built around high-value enterprise clients. Their "
        "cost structure, sales team, and product design are optimised for institutions paying thousands "
        "a year. Shipping a 7.99 retail product would cannibalise their premium pricing and confuse "
        "their positioning. It's the classic innovator's dilemma. Same applies to Arkham, they do "
        "blockchain intelligence with entity tracking but their interface is built for researchers "
        "and analysts, not everyday retail traders. No sentiment, no AI chat.\n\n"
        "Second, Nansen and Arkham both focus on on-chain analytics. They don't do sentiment analysis, "
        "they don't do news NLP, they don't have a conversational AI advisor. Sonar's advantage is "
        "the combination, not any single feature.\n\n"
        "Third, our moat deepens over time. We're building towards a proprietary LLM trained on our "
        "own accumulated signal data, whale movement history, and market outcomes. Think of it like "
        "building an AI quant that gets smarter every day. No competitor is doing this at the retail "
        "level. We also plan to build our own blockchain data pipeline, reducing dependency on "
        "third-party APIs and giving us data depth that's hard to replicate.\n\n"
        "The sustainable competitive advantage is: first mover in the affordable all-in-one space, "
        "a proprietary AI that compounds in intelligence over time, and a community of engaged "
        "retail traders that we're building now."
    )

    pdf.safe_page_break(50)
    pdf.qa_block(
        "Your commitment to the in-person programme and community?",
        "I'm fully committed. I've already experienced the value of the EI community through Idea "
        "Factory and Open Pitch Night, both were genuinely useful for shaping Sonar. I plan to be "
        "in the co-working space regularly, I'll actively participate in workshops, and I want to "
        "contribute back. On the technical side I can help other founders with web dev, AI integration, "
        "API design, and shipping to production. I'm happy to run informal sessions or pair-code "
        "with anyone who needs help. I'll show up."
    )

    # ============================
    # ANTICIPATED PANEL QUESTIONS
    # ============================
    pdf.add_page()
    pdf.section_title("Anticipated Panel Questions")
    pdf.body_text(
        "Beyond Andrea's feedback areas, here are questions the panel is likely to ask based on "
        "the brief's focus on innovation, validation, and founder-market fit."
    )

    pdf.safe_page_break(50)
    pdf.qa_block(
        "What's your riskiest assumption right now?",
        "That combining multiple data sources into one composite score genuinely improves trading "
        "outcomes versus using individual tools. If our signals aren't measurably better, the value "
        "proposition weakens. That's exactly why we're developing the backtesting engine, so traders "
        "can test this with real data and we can iterate on the algorithm. We want hard evidence "
        "before making strong claims, not just vibes."
    )

    pdf.safe_page_break(50)
    pdf.qa_block(
        "Your conversion rate is 1.25%. Is that good enough? What's your plan to improve it?",
        "So right now the conversion rate looks low but that's intentional. We deliberately made "
        "the free version more accessible recently to maximise the top of funnel, we grew 150 users "
        "in just 2 weeks with no marketing at all. The strategy is to get as many traders in as "
        "possible, let them experience the value, and then convert them gradually. The industry "
        "benchmark for freemium SaaS is around 2-5% and we'll get there as we start activating "
        "conversion. Our plan is threefold. First, improve the onboarding flow so new users "
        "immediately see value. Second, use Orca AI as the conversion hook because it's the feature "
        "traders get most excited about and we limit it to 1 question a day on free. Third, "
        "implement email nurture sequences that educate free users about premium features they're "
        "missing."
    )

    pdf.safe_page_break(60)
    pdf.qa_block(
        "How do you acquire users? What's your growth strategy?",
        "Right now growth is organic through crypto communities on Twitter/X, Reddit, and Discord. "
        "We're also working on a content marketing strategy: short-form video series explaining crypto "
        "concepts in an animated format, published on TikTok, Instagram Reels, and YouTube Shorts. "
        "A friend doing a similar format for history content hit 30K followers in 2 weeks, so the "
        "format is validated. We've designed bridge episodes that specifically funnel viewers to Sonar. "
        "Beyond that, SEO through our blog and glossary pages, and community building through a "
        "Sonar Discord server."
    )

    pdf.safe_page_break(60)
    pdf.qa_block(
        "What would you do with 10x more users tomorrow? Can your infrastructure handle it?",
        "Yes. The entire platform runs on Vercel's serverless infrastructure and Supabase, both of "
        "which scale automatically. Our data pipelines are independent cron jobs, they don't depend "
        "on user load. The only bottleneck would be AI API costs if Orca usage spiked, but we manage "
        "that through daily usage limits on both free and premium tiers. 10x users would actually be "
        "great because our unit economics improve with scale, fixed pipeline costs are spread across "
        "more subscribers."
    )

    pdf.safe_page_break(50)
    pdf.qa_block(
        "What have you learned since submitting the application?",
        "A lot actually. First, onboarding matters more than I thought. Users who don't understand "
        "the dashboard in the first 30 seconds tend to bounce, so we've been simplifying the initial "
        "experience. Second, Orca AI conversations are stickier than I expected. Users who try Orca "
        "come back more often, which confirms it should be the centrepiece of the premium offering. "
        "Third, growth can happen fast even without marketing. We went from 400 to 650+ users "
        "organically, 150 of those in just the last 2 weeks. That tells me the product has real "
        "pull. Fourth, I've gotten more structured about tracking metrics weekly rather than just "
        "building features and hoping for the best."
    )

    pdf.safe_page_break(50)
    pdf.qa_block(
        "Why should we pick you over other applicants?",
        "Because Sonar isn't an idea, it's a live product with 650+ users and real revenue. I've "
        "built the entire platform from scratch. I'm a CS student with deep AI experience, I did "
        "an AI internship in the UAE before starting this, so I have the technical foundation to "
        "build and ship fast without burning money on developers. My co-founder Saif is a CS and "
        "Maths student at King's handling our blockchain data engineering. Between us we move fast. "
        "What I need from the accelerator is the business mentorship, network, and structured "
        "accountability to match the speed of execution I already have on the technical side."
    )

    pdf.safe_page_break(60)
    pdf.qa_block(
        "What's your biggest challenge right now?",
        "User acquisition. The product works, the data is solid, and early users are engaged. But "
        "getting in front of enough crypto traders consistently is the bottleneck. I'm a strong "
        "builder but I need to become a stronger marketer. That's one of the things I'm hoping the "
        "accelerator can help with, both through mentorship and the network."
    )

    pdf.safe_page_break(50)
    pdf.qa_block(
        "How do you handle the regulatory landscape for crypto in the UK?",
        "We don't provide financial advice and we're very clear about that. Sonar provides data and "
        "analysis, not recommendations to buy or sell. Every signal includes a confidence score so "
        "users understand the uncertainty. We're also mindful of ASA and FCA guidelines around crypto "
        "marketing, so our content focuses on education and data transparency rather than promising "
        "returns. As the regulatory landscape evolves we'll adapt, but our core product is analytics, "
        "not trading, which keeps us in a safer position."
    )

    pdf.safe_page_break(50)
    pdf.qa_block(
        "What does success look like in 12 months?",
        "5,000 active users, 250+ paying subscribers, meaningful monthly recurring revenue that "
        "covers costs with margin, a launched public API, and a clear path to pre-seed investment. "
        "But the metric I care about most is whether traders using Sonar are actually making better "
        "decisions. If our backtesting data shows our signals consistently outperform random, that's "
        "the real proof that we've built something valuable."
    )

    pdf.safe_page_break(50)
    pdf.qa_block(
        "How do you balance studies and the startup?",
        "I'm disciplined about time. I run weekly sprints with clear priorities, and my co-founder "
        "Saif shares the workload, he's a CS and Maths student at King's and leads our Bitcoin and "
        "Solana data engineering. I'm in my final two years of CS with Management, and honestly "
        "the degree and the startup feed into each other. The management modules help me think "
        "about positioning and growth, and the CS modules keep my technical skills sharp. Having "
        "done an AI internship in the UAE before this, I also know how to structure my time around "
        "intense technical work. I make sure to exercise, take time offline, and lean on my support "
        "network when things get intense."
    )

    # ============================
    # KEY METRICS CHEAT SHEET
    # ============================
    pdf.add_page()
    pdf.section_title("Key Numbers & Talking Points")
    pdf.body_text("Keep these front of mind. Drop them naturally in conversation.")

    pdf.sub_title("Traction")
    pdf.bullet("650+ users (grew 150 in last 2 weeks with zero marketing)")
    pdf.bullet("5 paying subscribers at 7.99/month")
    pdf.bullet("480 ARR (annual recurring revenue)")
    pdf.bullet("Product live at sonartracker.io since early 2026")
    pdf.bullet("Stripe processing real payments")
    pdf.bullet("100+ tokens tracked across major blockchains")
    pdf.bullet("6 automated data pipelines running in production")
    pdf.bullet("Free tier deliberately opened up to maximise top of funnel")

    pdf.ln(2)
    pdf.sub_title("Unit Economics")
    pdf.bullet("Operating costs: ~500/month (APIs, Vercel, Supabase, AI inference)")
    pdf.bullet("Premium: 7.99/month = 95.88/year per subscriber")
    pdf.bullet("Break-even at roughly 63 subscribers at current cost base")
    pdf.bullet("Future tiers: Pro at 19.99-29.99, API tier, institutional tier")
    pdf.bullet("Costs will decrease as we build proprietary data pipelines and our own LLM")

    pdf.ln(2)
    pdf.sub_title("Market")
    pdf.bullet("420M+ crypto holders globally, 50-80M active traders")
    pdf.bullet("Crypto analytics market: $2.2B (2024) projected to $8.6B by 2030 (25% CAGR)")
    pdf.bullet("20-30M English-speaking active traders (initial focus)")
    pdf.bullet("Nansen raised $75M, Dune reached $1B valuation, Arkham launched own token")

    pdf.ln(2)
    pdf.sub_title("Competitive Positioning")
    pdf.bullet("Nansen: $150/month, no AI, no sentiment, enterprise focus")
    pdf.bullet("Arkham: blockchain intelligence but complex UI, no sentiment, no AI chat, researcher-focused")
    pdf.bullet("Glassnode: $40-800/month, no AI, limited altcoins")
    pdf.bullet("Whale Alert: free but raw data, no analysis or context")
    pdf.bullet("LunarCrush: social only, ignores on-chain whale activity")
    pdf.bullet("Dune: powerful but requires SQL, inaccessible to most retail")
    pdf.bullet("Sonar: ONLY platform combining all + AI advisor for 7.99/month")
    pdf.bullet("Long-term moat: proprietary LLM trained on our own signal data = AI quant for retail")

    pdf.ln(2)
    pdf.sub_title("Grants & Validation")
    pdf.bullet("2,000 from Idea Factory + 200 from Open Pitch Night")
    pdf.bullet("Customer discovery: 20+ trader interviews through Idea Factory")
    pdf.bullet("Applying for Solana Foundation, Ethereum Foundation, Polygon grants")

    # ============================
    # QUESTIONS TO ASK THE PANEL
    # ============================
    pdf.safe_page_break(80)
    pdf.section_title("Questions to Ask the Panel")
    pdf.body_text(
        "Have 2-3 ready. Asking good questions shows you're serious about the programme, "
        "not just the badge."
    )

    pdf.bullet(
        "What does the most successful founder from a previous cohort have in common in terms "
        "of how they used the programme?"
    )
    pdf.bullet(
        "Are there mentors in the network with experience in fintech, crypto, or data products "
        "specifically?"
    )
    pdf.bullet(
        "How structured is the workshop programme versus self-directed work time? I want to "
        "make sure I'm balancing building with learning."
    )
    pdf.bullet(
        "What's the biggest mistake you see accelerator founders make in the first 3 months?"
    )

    # ============================
    # FINAL TIPS
    # ============================
    pdf.safe_page_break(80)
    pdf.section_title("Final Tips")
    pdf.bullet("Be conversational, not rehearsed. They want to meet Eduardo, not a pitch bot.")
    pdf.bullet("Lead with the problem and your personal experience. It's your strongest hook.")
    pdf.bullet("When you don't know something, say so honestly and explain how you'd find out.")
    pdf.bullet("Numbers build credibility. Drop traction stats naturally throughout your answers.")
    pdf.bullet("Show coachability. Mention what you've learned, what you got wrong, what you changed.")
    pdf.bullet("End strong. Your closing impression matters. Be enthusiastic about the programme specifically.")
    pdf.bullet("Test your Teams setup beforehand. Camera on, good lighting, clean background.")
    pdf.bullet("Have sonartracker.io open in a tab in case they ask for a quick demo walkthrough.")

    pdf.output(output_path)
    print(f"PDF generated at: {output_path}")


if __name__ == "__main__":
    generate()
