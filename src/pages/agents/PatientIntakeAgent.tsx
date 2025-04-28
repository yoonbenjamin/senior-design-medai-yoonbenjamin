import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ListTree,
  Scroll,
  Info,
  ArrowRight,
  BrainCircuit,
  AlertCircle,
  Sparkles,
  Zap,
  FileCode,
  BeakerIcon
} from 'lucide-react';

// Add these interfaces at the top
interface AgentCard {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    route: string;
    features: string[];
    recommendedFor: string;
  }
  
  interface ExperimentalAgent {
    id: string;
    name: string;
    description: string;
    model: string;
    icon: React.ReactNode;
    route: string;
    status: 'stable' | 'beta' | 'experimental';
  }

const PatientIntakeAgent = () => {
  const navigate = useNavigate();

  const intakeAgents = [
    {
      id: 'oneliner',
      title: 'Medical One-Liner Generation',
      description: 'Generate concise medical summaries from detailed pathology reports',
      icon: <Scroll className="h-10 w-10 text-purple-500" />,
      // route: '/oneliner-intake-agent',
      route: '/patient-list-m',
      features: [
        'Automated summary generation',
        'Multi-model comparison',
        'Interactive editing capabilities',
        'Clinician feedback integration'
      ],
      recommendedFor: 'Quick case overview and documentation'
    },
    {
      id: 'structured',
      title: 'Structured Data Extraction',
      description: 'Extract key clinical information from pathology reports into structured data fields',
      icon: <ListTree className="h-10 w-10 text-blue-500" />,
      // route: '/structured-intake-agent',
      route: '/patient-list-s',
      features: [
        'Disease site and stage extraction',
        'Patient demographics analysis',
        'Treatment relevance assessment',
        'Multi-model comparison and validation'
      ],
      recommendedFor: 'Initial patient assessment and data entry'
    },
  ];

  // Add this after the intakeAgents array
const experimentalAgents: ExperimentalAgent[] = [
    {
      id: 'claude',
      name: 'Claude Feature Extraction',
      description: 'Extract key features from pathology reports',
      model: 'Claude',
      icon: <BrainCircuit className="h-5 w-5 text-blue-400" />,
      route: '/claude-intake-agent',
      status: 'experimental'
    },
    {
      id: 'llama',
      name: 'Llama Summary',
      description: 'Test Llama\'s approach to medical summarization with side by side output comparison',
      model: 'Llama 2',
      icon: <Sparkles className="h-5 w-5 text-purple-400" />,
      route: '/llama-intake-agent',
      status: 'experimental'
    },
    {
      id: 'gpt',
      name: 'GPT Summary',
      description: 'Experiment with GPT summarization capabilities',
      model: 'GPT',
      icon: <Zap className="h-5 w-5 text-yellow-400" />,
      route: '/gpt-intake-agent',
      status: 'experimental'
    },
    {
      id: 'huggingface',
      name: 'HuggingFace Summary',
      description: 'Try open-source models for medical summaries',
      model: 'HuggingFace',
      icon: <FileCode className="h-5 w-5 text-green-400" />,
      route: '/hugging-face-intake-agent',
      status: 'experimental'
    }
  ];
  

  return (
    <div className="min-h-screen text-white p-8">
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Patient Intake Processing</h1>
            <p className="text-gray-400 text-lg">
                Select the appropriate processing method based on your documentation needs
            </p>
            </div>

            {/* Agent Selection Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {intakeAgents.map((agent) => (
                <Card 
                key={agent.id}
                className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300"
                >
                <CardHeader>
                    <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {agent.icon}
                        <div>
                        <CardTitle className="text-xl mb-2">{agent.title}</CardTitle>
                        <CardDescription>{agent.description}</CardDescription>
                        </div>
                    </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                    {/* Features */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-2">Key Features</h3>
                        <ul className="space-y-2">
                        {agent.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2">
                            <BrainCircuit className="h-4 w-4 text-blue-400" />
                            <span>{feature}</span>
                            </li>
                        ))}
                        </ul>
                    </div>

                    {/* Recommended Use */}
                    <div className="flex items-start gap-2 bg-gray-700/50 p-3 rounded-lg">
                        <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                        <h3 className="text-sm font-medium mb-1">Recommended Use</h3>
                        <p className="text-sm text-gray-400">{agent.recommendedFor}</p>
                        </div>
                    </div>

                    {/* Action Button */}
                    <Button
                        onClick={() => navigate(agent.route)}
                        className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
                    >
                        <span>Use {agent.title}</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    </div>
                </CardContent>
                </Card>
            ))}
            </div>

            {/* Additional Information */}
            <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Important Information
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                    <h3 className="font-medium mb-1">Document Requirements</h3>
                    <p className="text-sm text-gray-400">
                        Upload clear, complete pathology reports in PDF or text format. 
                        Ensure all patient identifying information is appropriately handled.
                    </p>
                    </div>
                </div>
                <div className="flex items-start gap-3">
                    <BrainCircuit className="h-5 w-5 text-gray-400" />
                    <div>
                    <h3 className="font-medium mb-1">Processing Methods</h3>
                    <p className="text-sm text-gray-400">
                        Both agents utilize multiple AI models for enhanced accuracy and validation. 
                        Results can be reviewed and edited before final submission.
                    </p>
                    </div>
                </div>
                </div>
            </CardContent>
            </Card>
        </div>
        <div className="mt-12">
        <div className="flex items-center gap-3 mb-6">
            <BeakerIcon className="h-6 w-6 text-purple-400" />
            <h2 className="text-2xl font-bold">Agent Playground</h2>
        </div>
        <p className="text-gray-400 mb-6">
            Experiment with different LLM models and compare their performance on medical document analysis
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {experimentalAgents.map((agent) => (
            <Card 
                key={agent.id}
                className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-all duration-300"
            >
                <CardHeader>
                <div className="flex items-center justify-between mb-2">
                    {agent.icon}
                    <span className={`text-xs px-2 py-1 rounded ${
                    agent.status === 'stable' ? 'bg-green-500/20 text-green-400' :
                    agent.status === 'beta' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-yellow-500/20 text-yellow-400'
                    }`}>
                    {agent.status.toUpperCase()}
                    </span>
                </div>
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <p className="text-sm text-gray-400">{agent.description}</p>
                </CardHeader>
                <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <span>Model: {agent.model}</span>
                </div>
                <Button
                    onClick={() => navigate(agent.route)}
                    className="w-full bg-gray-700 hover:bg-gray-600"
                >
                    Try Agent
                </Button>
                </CardContent>
            </Card>
            ))}
        </div>

        <Card className="mt-6 bg-gray-800/50 border-gray-700">
            <CardContent className="p-4">
            <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                <p className="text-sm text-gray-400">
                These experimental agents are provided for testing and comparison purposes. 
                Results may vary and should be validated before clinical use. Feel free to 
                try different models and provide feedback to help improve their performance.
                </p>
            </div>
            </CardContent>
        </Card>
        </div>
    </div>
  );
};

export default PatientIntakeAgent;