import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TestConnectionButton } from './client';

export const instant = false;

export default async function AISettingsPage() {
  const settings = await prisma.systemSetting.findFirst();
  if (!settings) return <div>No settings found</div>;

  let taskFallbacks: any = {};
  try {
    taskFallbacks = JSON.parse(settings.taskFallbacks);
  } catch (e) {}

  const tasks = [
    { key: 'quizGeneration', label: 'Quiz Generation' },
    { key: 'flashcardGeneration', label: 'Flashcard Generation' },
    { key: 'revisionTools', label: 'Revision Tools' },
    { key: 'classInsights', label: 'Class Insights' },
    { key: 'studyDoubtBot', label: 'Study Doubt Bot' },
    { key: 'platformHelpBot', label: 'Platform Help Bot' },
    { key: 'assignmentFeedback', label: 'Assignment Feedback Draft' },
    { key: 'shortAnswerGrading', label: 'Short-answer Grading Suggestions' }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">AI Settings</h1>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Master Switch & Providers</CardTitle>
            <CardDescription>Configure primary and fallback AI engines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="aiMasterSwitch" defaultChecked={settings.aiMasterSwitch} />
              <Label htmlFor="aiMasterSwitch">Allow sending data to external AI (Gemini)</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Primary Provider</Label>
                <Input defaultValue={settings.aiPrimaryProvider} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Fallback Provider</Label>
                <Input defaultValue={settings.aiFallbackProvider} readOnly />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ollama Configuration</CardTitle>
            <CardDescription>Primary local AI engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input defaultValue={settings.ollamaBaseUrl} />
            </div>
            <div className="space-y-2">
              <Label>Chat Model</Label>
              <Input defaultValue={settings.ollamaChatModel} />
            </div>
            <div className="space-y-2">
              <Label>Embedding Model</Label>
              <Input defaultValue={settings.ollamaEmbedModel} />
            </div>
            <TestConnectionButton providerName="Ollama" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gemini Configuration</CardTitle>
            <CardDescription>External fallback AI engine</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Gemini API Key</Label>
              <Input type="password" placeholder="****************" />
              <p className="text-xs text-muted-foreground">Stored encrypted. Never returned to the client.</p>
            </div>
            <div className="space-y-2">
              <Label>Gemini Model</Label>
              <Input defaultValue={settings.geminiModel} />
            </div>
            <TestConnectionButton providerName="Gemini" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Per-Task Fallback Policy</CardTitle>
            <CardDescription>Select which tasks are allowed to use the external AI fallback</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <div key={task.key} className="flex items-center space-x-2">
                  <Checkbox id={task.key} defaultChecked={taskFallbacks[task.key]} />
                  <Label htmlFor={task.key}>{task.label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button className="w-full bg-[#4CAF50] hover:bg-[#45a049] text-white">Save AI Settings</Button>
      </div>
    </div>
  );
}
