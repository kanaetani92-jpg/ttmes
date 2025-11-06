import type { StageGuide } from '@/data/stageGuides';

type Props = {
  guide: StageGuide;
};

const SectionTitle = ({ children }: { children: string }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-300">{children}</h3>
);

const BulletList = ({ items }: { items: string[] }) => (
  <ul className="ml-4 list-disc space-y-1 text-gray-100">
    {items.map((item, index) => (
      <li key={`${item}-${index}`}>{item}</li>
    ))}
  </ul>
);

const CHECKLIST_LABELS: Record<string, string> = {
  emotional: '感情面',
  cognitive_behavioral: '認知・行動面',
  physical: '身体面',
};

const StageGuideStepCard = ({ step }: { step: StageGuide['steps'][number] }) => {
  const listEntries =
    'lists' in step && step.lists
      ? Object.values(step.lists as Record<string, unknown>)
      : [];
  const checklist = 'checklist' in step ? (step.checklist as unknown) : undefined;
  const instructions =
    'instructions' in step && Array.isArray(step.instructions) ? step.instructions : undefined;
  const goal = 'goal' in step && typeof step.goal === 'string' ? step.goal : undefined;

  return (
    <div className="space-y-3 rounded-lg bg-white/5 p-4">
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-white">{step.title}</h4>
        {goal ? <p className="text-xs text-gray-400">目標: {goal}</p> : null}
      </div>

      {instructions && instructions.length ? (
        <div className="space-y-2">
          <SectionTitle>進め方</SectionTitle>
          <BulletList items={instructions} />
        </div>
      ) : null}

      {listEntries.length ? (
        <div className="space-y-3">
          {listEntries.map((rawList, index) => {
            const list = rawList as {
              display_label?: string;
              description?: string;
              items?: string[];
              max_items?: number;
            };

            return (
              <div key={`list-${index}`} className="space-y-2 rounded-lg bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">{list.display_label}</p>
                {typeof list.description === 'string' ? (
                  <p className="text-xs text-gray-300">{list.description}</p>
                ) : null}
                {Array.isArray(list.items) && list.items.length ? <BulletList items={list.items} /> : null}
                {typeof list.max_items === 'number' ? (
                  <p className="text-xs text-gray-400">最大 {list.max_items} 個まで記入できます。</p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {'excuse_categories' in step &&
      Array.isArray(step.excuse_categories) &&
      step.excuse_categories.length ? (
        <div className="space-y-3">
          {step.excuse_categories.map((category, index) => {
            const examples = Array.isArray(category.examples)
              ? category.examples.filter((example) => Boolean(example?.trim?.() ?? example))
              : [];
            const prompt =
              'prompt' in category && typeof category.prompt === 'string' ? category.prompt : undefined;

            return (
              <div key={`${category.category}-${index}`} className="space-y-2 rounded-lg bg-white/5 p-3">
                <p className="text-sm font-semibold text-white">{category.category}</p>
                {examples.length ? <BulletList items={examples} /> : null}
                {prompt ? <p className="text-xs text-gray-300">{prompt}</p> : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {'cases' in step && Array.isArray(step.cases) && step.cases.length ? (
        <div className="space-y-3">
          {step.cases.map((caseStudy, index) => {
            const meta = [
              typeof caseStudy.age === 'number' ? `${caseStudy.age}歳` : null,
              caseStudy.gender,
              caseStudy.role,
            ]
              .filter(Boolean)
              .join(' / ');

            return (
              <div key={`${caseStudy.title}-${index}`} className="space-y-2 rounded-lg bg-white/5 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{caseStudy.category}</p>
                <p className="text-sm font-semibold text-white">{caseStudy.title}</p>
                {meta ? <p className="text-xs text-gray-400">{meta}</p> : null}
                <p className="whitespace-pre-wrap text-gray-100">{caseStudy.body}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {'psychoeducation' in step && typeof step.psychoeducation === 'string' ? (
        <div className="space-y-2">
          <SectionTitle>ポイント</SectionTitle>
          <p className="whitespace-pre-wrap text-gray-100">{step.psychoeducation}</p>
        </div>
      ) : null}

      {checklist && !Array.isArray(checklist) && typeof checklist === 'object' ? (
        <div className="space-y-2">
          <SectionTitle>チェックリスト</SectionTitle>
          <div className="space-y-3">
            {Object.entries(checklist as Record<string, string[]>).map(([key, items]) => (
              <div key={key} className="space-y-1">
                <p className="text-xs font-semibold text-gray-300">{CHECKLIST_LABELS[key] ?? key}</p>
                <BulletList items={items} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {Array.isArray(checklist) && checklist.length ? (
        <div className="space-y-2">
          <SectionTitle>チェックリスト</SectionTitle>
          <BulletList items={checklist} />
        </div>
      ) : null}

      {'web_links' in step && Array.isArray(step.web_links) && step.web_links.length ? (
        <div className="space-y-2">
          <SectionTitle>参考リンク</SectionTitle>
          <ul className="space-y-1 text-sm text-blue-200">
            {step.web_links.map((link, index) => (
              <li key={`${link.url}-${index}`}>
                <a href={link.url} target="_blank" rel="noreferrer" className="underline">
                  {link.label ?? link.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export function StageGuideMessage({ guide }: Props) {
  return (
    <div className="space-y-6 text-left text-sm leading-relaxed">
      <div className="space-y-2">
        <SectionTitle>ステージガイド</SectionTitle>
        <h2 className="text-lg font-semibold text-white">{guide.chapter_title}</h2>
        <p className="text-xs text-gray-400">{guide.chapter_intro.stage_name}</p>
        <p className="whitespace-pre-wrap text-gray-100">{guide.chapter_intro.text}</p>
      </div>

      {guide.assessment ? (
        <div className="space-y-2 rounded-lg bg-white/5 p-4">
          <SectionTitle>セルフチェック</SectionTitle>
          <p className="text-gray-100">{guide.assessment.question}</p>
          {Array.isArray(guide.assessment.options) && guide.assessment.options.length ? (
            <ul className="ml-4 list-disc space-y-1 text-gray-100">
              {guide.assessment.options.map((option) => (
                <li key={option.id}>{option.label}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {Array.isArray(guide.steps) && guide.steps.length ? (
        <div className="space-y-4">
          {guide.steps.map((step) => (
            <StageGuideStepCard key={step.id} step={step} />
          ))}
        </div>
      ) : null}

      {guide.summary ? (
        <div className="space-y-3 rounded-lg bg-white/5 p-4">
          <SectionTitle>まとめ</SectionTitle>
          <h3 className="text-base font-semibold text-white">{guide.summary.title}</h3>
          {Array.isArray(guide.summary.points) && guide.summary.points.length ? (
            <BulletList items={guide.summary.points} />
          ) : null}
          {guide.summary.reflection_prompt ? (
            <p className="text-xs text-gray-300">{guide.summary.reflection_prompt}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

