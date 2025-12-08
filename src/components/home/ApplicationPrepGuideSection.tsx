import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileText,  DollarSign, Heart, User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

export function ApplicationPrepGuideSection() {
  const [openSteps, setOpenSteps] = useState<Record<number, boolean>>({});
  const [showAll, setShowAll] = useState(false);

  const toggleStep = (index: number) => {
    setOpenSteps(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleAll = () => {
    const newShowAll = !showAll;
    setShowAll(newShowAll);
    
    if (newShowAll) {
      // Open all steps
      const allOpen = applicationSteps.reduce((acc, _, index) => {
        acc[index] = true;
        return acc;
      }, {} as Record<number, boolean>);
      setOpenSteps(allOpen);
    } else {
      // Close all steps
      setOpenSteps({});
    }
  };

  const applicationSteps = [
    {
      icon: <User className="w-6 h-6" />,
      title: "Personal Information",
      description: "Basic details about yourself and eligibility",
      questions: [
        "Full name and contact information",
        "Date of birth (must be 18-35 years old)",
        "Country of citizenship (Ghana, Kenya, Nigeria, Rwanda, Tanzania)",
        "Country of residence (must be in participating countries)",
        "Highest level of education"
      ],
      wordRequirements: "No lengthy responses required - mostly form fields and selections"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Business Information",
      description: "Details about your business or venture",
      questions: [
        "Business name and registration status",
        "Business description and problem it solves",
        "Product/service description",
        "Climate adaptation contribution",
        "Current challenges and support needed"
      ],
      wordRequirements: "Multiple 20-1000 word responses required",
      longQuestions: [
        { question: "Business description", words: "20-1000 words" },
        { question: "Problem your business solves", words: "20-1000 words" },
        { question: "Product/service description", words: "20-1000 words" },
        { question: "Climate adaptation contribution", words: "50-1000 words" },
        { question: "Climate extreme impact description", words: "50-1000 words" },
        { question: "Current challenges", words: "20-1000 words" },
        { question: "Support needed", words: "20-1000 words" }
      ]
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: "Climate Adaptation Solution",
      description: "Your climate solution and its impact",
      questions: [
        "Solution title and detailed description",
        "Primary climate challenge addressed",
        "Target beneficiaries and estimated count",
        "Technology and innovation approach",
        "Implementation and scaling strategy"
      ],
      wordRequirements: "Several detailed responses up to 2000 words",
      longQuestions: [
        { question: "Solution description", words: "50-2000 words" },
        { question: "Target beneficiaries description", words: "20-1000 words" },
        { question: "Technology description", words: "20-1000 words" },
        { question: "Innovation description", words: "20-1000 words" },
        { question: "Implementation approach", words: "20-1000 words" },
        { question: "Scaling strategy", words: "20-1000 words" }
      ]
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Financial Information",
      description: "Financial status and funding requirements",
      questions: [
        "Current revenue and growth metrics",
        "Previous funding history",
        "Requested funding amount ($1,000 - $100,000)",
        "How funding will be used",
        "Revenue model and cost structure"
      ],
      wordRequirements: "Multiple 20-1000 word business descriptions",
      longQuestions: [
        { question: "How funding will be used", words: "50-1000 words" },
        { question: "Revenue model", words: "20-1000 words" },
        { question: "Cost structure", words: "20-1000 words" },
        { question: "Path to sustainability", words: "50-1000 words" },
        { question: "Financial challenges", words: "20-1000 words" }
      ]
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Support Needs",
      description: "What support you need to succeed",
      questions: [
        "Types of support needed (mentorship, training, networking)",
        "Specific mentorship and training requirements",
        "Networking and resource needs",
        "Expected business and environmental impact"
      ],
      wordRequirements: "Multiple detailed responses 20-1000 words each",
      longQuestions: [
        { question: "Mentorship needs", words: "20-1000 words" },
        { question: "Training needs", words: "20-1000 words" },
        { question: "Networking needs", words: "20-1000 words" },
        { question: "Resources needed", words: "20-1000 words" },
        { question: "Expected business impact", words: "50-1000 words" },
        { question: "Expected environmental impact", words: "50-1000 words" }
      ]
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Prepare for Your Application
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
            Get ready for success! Here&apos;s exactly what you&apos;ll need to complete your application. 
            Prepare your responses in advance to make the process smooth and efficient.
          </p>
          
          <Button
            onClick={toggleAll}
            variant="outline"
            className="border-[#0B5FBA] text-[#0B5FBA] hover:bg-[#0B5FBA] hover:text-white transition-colors duration-300"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Collapse All Sections
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Expand All Sections
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6 mb-12">
          {applicationSteps.map((step, index) => {
            const isOpen = openSteps[index] || false;
            
            return (
              <Collapsible
                key={index}
                open={isOpen}
                onOpenChange={() => toggleStep(index)}
              >
                <Card className="border-2 hover:border-[#0B5FBA]/20 transition-all duration-300 bg-white dark:bg-gray-800">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 rounded-t-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-full bg-[#0B5FBA]/10 text-[#0B5FBA]">
                            {step.icon}
                          </div>
                          <div className="text-left">
                            <Badge variant="outline" className="mb-2 border-[#00D0AB] text-[#00D0AB]">
                              Step {index + 1}
                            </Badge>
                            <CardTitle className="text-2xl text-gray-900 dark:text-white">
                              {step.title}
                            </CardTitle>
                            <CardDescription className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                              {step.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="secondary" 
                            className="bg-[#00D0AB]/10 text-[#00D0AB] border-[#00D0AB]/20 hidden sm:flex"
                          >
                            {step.longQuestions ? `${step.longQuestions.length} detailed questions` : 'Form fields'}
                          </Badge>
                          {isOpen ? (
                            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                    <CardContent className="pt-0 space-y-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          What You&apos;ll Be Asked:
                        </h4>
                        <ul className="space-y-2">
                          {step.questions.map((question, qIndex) => (
                            <li key={qIndex} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                              <CheckCircle className="w-4 h-4 text-[#00D0AB] mt-0.5 flex-shrink-0" />
                              <span>{question}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-blue-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-semibold text-[#0B5FBA] dark:text-blue-300 mb-2">
                          📝 Writing Requirements:
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {step.wordRequirements}
                        </p>
                        
                        {step.longQuestions && (
                          <div className="space-y-2">
                            <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                              Detailed Questions:
                            </p>
                            <div className="grid gap-2">
                              {step.longQuestions.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-700 dark:text-gray-300">{item.question}</span>
                                  <Badge variant="secondary" className="bg-[#00D0AB]/10 text-[#00D0AB] border-[#00D0AB]/20">
                                    {item.words}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

      
      </div>
    </section>
  );
} 