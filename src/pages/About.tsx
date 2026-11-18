import { PageBand } from "@/features/site/PageBand";
import { SiteHeader } from "@/features/site/SiteHeader";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/features/site/SiteFooter";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const About = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <PageBand eyebrow={t("about.eyebrow", "About DataPlus")} title={t("about.title", "Our story")} body={t("about.body", "Since 2021 we have trained people across Rwanda and the region to turn data into decisions.")} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">

          {/* White Card with Story */}
          <div className="bg-card rounded-xl p-8 md:p-12 border border-border">
            <div className="space-y-8">
              {/* Paragraph 1 */}
              <div className="space-y-4">
                <p className="text-xl leading-relaxed text-foreground">
                  {t("about.foundedIn", "Founded in")}{" "}<span className="font-bold text-primary text-2xl">2021</span>{t("about.dataRwandaWasEstablishedToBridge", ", Data + Rwanda was established to bridge the growing gap in data and digital skills across Rwanda and the East African region.")}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-primary/20"></div>

              {/* Paragraph 2 */}
              <div className="space-y-4">
                <p className="text-xl leading-relaxed text-foreground">
                  {t("about.throughTailoredTrainingResearchConsultancy", "Through tailored training, research consultancy, and tech-driven solutions, we've empowered nearly")}{" "}<span className="font-bold text-primary text-2xl">{t("about.n1000Individuals", "1,000 individuals")}</span>{" "}{t("about.includingOver", "including over")}{" "}<span className="font-bold text-primary text-2xl">{t("about.n500Professionals", "500 professionals")}</span>{" "}{t("about.acrossSectorsLikeHealthAgricultureEducatio", "across sectors like health, agriculture, education, and business with practical skills in data analytics and emerging technologies.")}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-primary/20"></div>

              {/* Paragraph 3 */}
              <div className="space-y-4">
                <p className="text-xl leading-relaxed text-foreground">
                  {t("about.todayOurAlumniWorkWithLeading", "Today, our alumni work with leading national and international institutions, driving data-informed decisions and supporting Rwanda's vision of becoming a")}{" "}<span className="font-bold text-primary">{t("about.knowledgeBasedAndInnovationLedEconomy", "knowledge-based and innovation-led economy")}</span>.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t-2 border-border">
                {/* Stat 1 */}
                <div className="text-center p-6 rounded-xl">
                  <p className="text-5xl font-bold text-primary mb-2">1,000+</p>
                  <p className="text-foreground font-medium">{t("about.individualsEmpowered", "Individuals Empowered")}</p>
                </div>

                {/* Stat 2 */}
                <div className="text-center p-6 rounded-xl">
                  <p className="text-5xl font-bold text-primary mb-2">500+</p>
                  <p className="text-foreground font-medium">{t("about.professionalsTrained", "Professionals Trained")}</p>
                </div>

                {/* Stat 3 */}
                <div className="text-center p-6 rounded-xl">
                  <p className="text-5xl font-bold text-primary mb-2">2021</p>
                  <p className="text-foreground font-medium">{t("about.yearFounded", "Year Founded")}</p>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="mt-12 text-center">
                <div className="inline-flex items-center gap-3 text-white px-8 py-4 rounded-full bg-forest">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-lg font-semibold">{t("about.empoweringRwandaSDigitalFuture", "Empowering Rwanda's Digital Future")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="bg-primary hover:bg-primary-hover text-white px-8 py-3 text-lg font-medium transition-colors duration-300"
            >
              {t("about.joinOurCommunity", "Join Our Community")}
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default About;
