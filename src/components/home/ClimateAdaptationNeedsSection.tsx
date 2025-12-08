"use client";

import { CheckCircle } from "lucide-react";
import Image from "next/image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const adaptationNeedsData = [
  {
    id: "ghana",
    country: "Ghana",
    flag: "🇬🇭",
    imageUrl: "/images/coffee-ghana.jpg",
    title:
      "Challenge Statement: Climate Adaptation Solutions for Ghana's Tree Crop Sector",
    intro:
      "Ghana's key agricultural value chains cocoa, cashew, shea, coconut, oil palm, mango, and rubber are increasingly vulnerable to climate change. Rising temperatures, changing rainfall patterns, water stress, and shifting ecological zones threaten crop productivity and rural livelihoods. We are calling on younth-led  MSMEs, agri-tech innovators, and MSMEs to design and scale climate adaptation solutions that respond to crop specific climate risks and unlock new agricultural opportunities.",
    sections: [
      {
        title: "In the Agriculture Sector, we seek solutions in:",
        points: [
          "Incremental Adaptation Measures: Support water conservation techniques, canopy management, and other practices to strengthen resilience in vulnerable crop zones.",
          "Systemic Resilience Strategies: Enable agroforestry systems, climate-resilient irrigation, and the adoption of improved crop varieties to support long term adaptation.",
          "Transformational Change: Facilitate livelihood transitions and crop diversification in regions where traditional agriculture is no longer viable due to climate pressures.",
          "Rainwater Harvesting: Build and deploy harvesting systems to capture and store water for use during dry periods.",
          "Efficient Irrigation Services: Offer drip and basin irrigation solutions that optimize water use and improve soil moisture retention for tree crops.",
          "Adaptive Drainage Systems: Design drainage infrastructure for waterlogged zones and smart irrigation solutions for regions experiencing increased aridity.",
          "Drought-Resistant Varieties: Develop and distribute site-specific, climate-resilient crop germplasm tailored to future weather patterns.",
          "Climate-Informed Planting: Create adaptive planting calendars and systems responsive to shifting growing seasons and temperature variability.",
          "Early Warning and Training Platforms: Build Early Warning Systems (EWS) and deliver farmer education programs to prepare for floods, droughts, and extreme weather events.",
          "Localized Decision Support: Provide hyper-local weather forecasts, digital advisory tools, and decision-support platforms to help farmers make climate-smart choices.",
        ],
      },
    ],
  },
  {
    id: "kenya",
    country: "Kenya",
    flag: "🇰🇪",
    imageUrl: "/images/road-kenya.jpg",
    title: "Kenya Adaptation Needs",
    intro:
      "We are calling on younth-led  MSMEs to develop innovative, scalable, and inclusive climate adaptation solutions that build resilience in Kenya's agriculture and road infrastructure sectors, particularly in vulnerable regions like the Lesseru–Kitale and Morpus–Lokichar corridors.",
    sections: [
      {
        title: "In the Agriculture Sector, we seek solutions in:",
        points: [
          "Climate-Smart Agriculture: Develop drought-tolerant seed systems, pest-resistant crops (e.g., maize, millet), and improved farming practices for changing weather patterns.",
          "Livestock Resilience: Have platforms to promote heat-resistant breeds, better veterinary services, and water-efficient fodder systems for arid and semi-arid areas.",
          "Water Resource Management: Deliver climate-smart irrigation solutions—such as solar-powered pumps, drip kits, and rainwater harvesting—alongside watershed protection.",
          "Disaster Preparedness: Mobile apps and SMS-based tools to deliver early warnings for floods and droughts, integrating meteorological and satellite data.",
          "Farmer Support Platforms: Enable smallholders—especially women and youth—to access affordable credit, insurance, inputs, training, and fair markets.",
          "Ecosystem Restoration: Offer services in reforestation, wetland protection, and erosion control using bioengineering techniques like vetiver grass planting.",
        ],
      },
      {
        title: "In the Transport Infrastructure Sector, we seek solutions in:",
        points: [
          "Flood Resilience Solutions: Design smart drainage systems, larger culverts, stormwater infrastructure, and sponge technologies like permeable pavements and rain gardens.",
          "Heat-Adapted Innovations: Introduce reflective or evaporative pavements, heat-resistant materials, and shaded rest zones to reduce thermal stress on roads.",
          "Soil Stability & Landslide Prevention: Develop bioengineering, erosion control, and slope reinforcement systems for vulnerable road segments.",
          "Dust and Wind Control: Offer solutions such as vegetative windbreaks, sand fences, and automated dust suppression technologies.",
          "Innovate with IoT-enabled monitoring systems and maintenance monitoring triggers for infrastructure developers",
        ],
      },
    ],
  },
  {
    id: "nigeria",
    country: "Nigeria",
    flag: "🇳🇬",
    imageUrl: "/images/cattle-nigeria.jpg",
    title:
      "Challenge Statement: Climate Adaptation Solutions for Nigeria's Livestock Sector",
    intro:
      "Nigeria's livestock sector—covering poultry, cattle, sheep, goats, and pigs—is increasingly vulnerable to climate change. Rising temperatures, water scarcity, feed shortages, and disease outbreaks are reducing productivity, threatening food security, and deepening poverty for millions of livestock farmers. We are calling on younth-led  MSMEs, agritech startups, and MSMEs to co-create innovative, climate-resilient solutions that build adaptation capacity, improve productivity, and create sustainable jobs in Nigeria's livestock value chains.",
    sections: [
      {
        title: "In the Livestock Sector, we seek solutions in:",
        points: [
          "Climate-Resilient Animal Shelters: Design cost-effective shelters and shade systems to protect livestock—especially poultry and pigs—from extreme heat stress.",
          "Sustainable Water Access: Provide rainwater harvesting systems and solar-powered boreholes to ensure reliable water supply during prolonged dry periods.",
          "Mobile Climate Information Services: Deploy mobile platforms delivering localized weather forecasts, early warnings, and livestock movement planning tools.",
          "Digital Advisory for Animal Health: Offer digital services providing guidance on animal health, feed efficiency, climate risks, and market access.",
          "Veterinary Response Systems: Launch vaccination and veterinary services supported by real-time disease tracking and incident reporting platforms.",
          "Early Detection for Livestock Outbreaks: Provide tools for early identification of diseases to help farmers prevent and contain animal health threats.",
          "Climate-Resilient Feed Production: Develop drought-tolerant forage, silage, and alternative feed sources to reduce dependence on unreliable crop harvests.",
          "Heat- and Drought-Tolerant Breeds: Support access to climate-adapted livestock breeds with improved resilience to heat stress and water scarcity.",
          "Post-Harvest Feed Storage: Offer cold or dry storage solutions to minimize feed spoilage and seasonal losses.",
          "Rangeland and Grazing Management Tools: Develop digital tools to support climate-smart rangeland planning, grazing rotation, and land sustainability.",
          "Livestock Monitoring Technologies: Deploy GPS and RFID-based tracking systems to monitor grazing patterns, prevent theft, and manage herd health.",
        ],
      },
    ],
  },
  {
    id: "rwanda",
    country: "Rwanda",
    flag: "🇷🇼",
    imageUrl: "/images/bus-rwanda.jpg",
    title: "Rwanda Adaptation Needs",
    intro:
      "We are calling on youth-led  MSMEs to develop innovative, scalable, and inclusive climate adaptation solutions that strengthen resilience in Rwanda's agriculture and urban mobility systems.",
    sections: [
      {
        title: "In the Agriculture Sector, we seek solutions in:",
        points: [
          "Climate-Smart Crop Systems: Develop and distribute drought-tolerant, early-maturing, and pest-resistant crop varieties (e.g., maize, millet).",
          "Water Management: Deploy smart irrigation services like solar-powered pumps, drip systems, rainwater harvesting, and watershed protection.",
          "Early Warning Systems: Build farmer-facing platforms for real-time weather alerts, seasonal forecasts, and pest outbreak monitoring.",
          "Livestock Resilience: Promote heat-tolerant breeds, veterinary service platforms, and fodder systems adapted to drylands.",
          "Soil & Erosion Management: Provide bioengineering services (e.g., vetiver grass planting) and sustainable land restoration tools.",
          "Post-Harvest Loss Reduction: Design cold chain storage, mobile processing units, and market linkage platforms.",
          "Ecosystem Restoration: Offer reforestation, wetland protection, and agroforestry services to improve soil health and carbon sequestration.",
          "Farmer Access & Finance: Enable platforms for smallholders—especially women and youth—to access credit, insurance, climate inputs, and fair markets.",
          "Decentralized Solutions: Support county-level climate planning and locally tailored agri-adaptation innovations.",
        ],
      },
      {
        title: "In the Transport Infrastructure Sector, we seek solutions in:",
        points: [
          "Heat Stress Solutions: Create reflective pavements, and heat-resilient road materials to reduce thermal stress in Kigali and beyond.",
          "Flood Resilience: Build smart stormwater systems, permeable pavements, bioswales, and early warning platforms for flood-prone neighborhoods.",
          "Drought-Proofing Infrastructure: Integrate water-efficient construction techniques and reuse systems to maintain urban greenery and mobility services.",
          "Landslide & Soil Instability Control: Offer slope stabilization, real-time monitoring, and erosion control systems for high-risk areas.",
          "Wind & Storm Protection: Design wind-resistant transit infrastructure, vegetative windbreaks, and storm preparedness platforms for urban communities.",
        ],
      },
    ],
  },

  {
    id: "tanzania",
    country: "Tanzania",
    flag: "🇹🇿",
    imageUrl: "/images/railway-tanzania.jpg",
    title: "Tanzania Adaptation Needs",
    intro:
      "Tanzania faces mounting climate challenges in both agriculture and transport infrastructure. Farmers must adapt to unpredictable rainfall, water scarcity, and post-harvest losses, while the nation’s transport systems require innovative solutions to withstand heat, flooding, and erosion. We invite bold, tech-enabled, and community-driven ideas that empower Tanzanian farmers with climate-smart irrigation, digital advisory tools, and resilient market access, as well as solutions that strengthen the durability and sustainability of critical infrastructure.",
    sections: [
      {
        title: "In the Agriculture Sector, we seek solutions in:",
        points: [
          "Climate-Resilient Irrigation: Deploy solar-powered pumps, drip irrigation kits, and rainwater harvesting systems to support efficient water use under changing climatic conditions.",
          "Digital Advisory Services: Offer mobile-based platforms (apps, SMS, WhatsApp) delivering real-time weather updates, agronomic guidance, and market intelligence.",
          "Post-Harvest Innovation: Improve cold chain logistics and introduce modern storage technologies to reduce spoilage and enhance food security.",
          "Farmer Training Programs: Deliver in-person or digital training on climate-smart agriculture practices to strengthen local resilience and adaptive capacity.",
          "Smart Farm Monitoring: Enable IoT and sensor-based technologies for tracking soil conditions, crop health, and microclimate variations.",
          "Market Access Solutions: Create digital platforms linking farmers to buyers, improving price transparency, and access to markets.",
          "Community-Based Adaptation: Facilitate shared resources such as seed banks, cooperative farming models, and communal water systems to build collective resilience.",
        ],
      },
      {
        title: "In the Transport Infrastructure Sector, we seek solutions that:",
        points: [
          "Climate-Resilient Materials: Develop and apply heat- and flood-resistant construction materials along with eco-friendly anti-corrosion coatings for long-term durability.",
          "Smart Monitoring Systems: Innovate with IoT-enabled sensors and mobile early warning tools for real-time infrastructure monitoring and risk alerts.",
          "Green Signaling Technologies: Provide solar-powered signaling systems and energy-efficient lighting to enhance operational sustainability and reduce emissions.",
          "Maintenance & Emergency Services: Offer climate-resilient inspection protocols and rapid-response services to maintain rail networks during extreme weather events.",
          "Smart Drainage Solutions: Build advanced drainage infrastructure to prevent flooding and minimize service disruptions.",
          "Nature-Based Protection: Apply ecological interventions such as vegetative embankments, mangrove restoration, and slope stabilization to protect transport assets from erosion and climate risks.",
        ],
      },
    ],
  },
];

export function ClimateAdaptationNeedsSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Climate Adaptation Needs
          </h2>
          <p className="text-lg text-gray-800 max-w-4xl mx-auto">
            Africa is on the frontlines of climate change. From erratic weather
            disrupting agriculture to floods damaging critical infrastructure,
            the impacts are being felt across sectors threatening livelihoods,
            mobility, and food security. We are calling on younth-led  MSMEs to bring forward innovative, scalable, and locally
            relevant solutions that strengthen the country&apos;s resilience to
            climate shocks. This Call for Solutions seeks bold ideas that
            address pressing adaptation needs in agriculture and infrastructure,
            in five countries with a focus on digital tools, green
            technologies, and community-driven models.
          </p>
        </div>

        <Tabs defaultValue="ghana" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2  p-0">
            {adaptationNeedsData.map((country) => (
              <TabsTrigger
                key={country.id}
                value={country.id}
                className="w-full py-3 text-base font-semibold rounded-lg transition-all duration-300
                  text-gray-900
                  data-[state=active]:bg-[#0B5FBA] data-[state=active]:text-gray-900
                  data-[state=active]:shadow-lg
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5FBA]"
              >
                <div className="flex items-center justify-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.country}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {adaptationNeedsData.map((country) => (
            <TabsContent
              key={country.id}
              value={country.id}
              className="mt-8 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-10"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="flex flex-col">
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                    {country.title}
                  </h3>
                  {country.intro && (
                    <p className="text-gray-800 mb-6">{country.intro}</p>
                  )}
                </div>
                <div className="relative w-full h-80 rounded-lg overflow-hidden order-first md:order-last">
                  <Image
                    src={country.imageUrl}
                    alt={`Image for ${country.country}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>

              <div className="mt-8 space-y-8">
                {country.sections.map((section, index) => (
                  <div key={index} className="border-t border-gray-200 pt-6">
                    <h4 className="text-xl font-semibold text-[#0B5FBA] mb-4">
                      {section.title}
                    </h4>
                    <ul className="space-y-3">
                      {section.points.map((point, pIndex) => (
                        <li key={pIndex} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                          <span className="text-gray-900">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
} 