
import ContentNavigator from '../../cms/contentNavigator'; 
import { useContent } from  '../../../utils/api/hooks/useContent'
import ProgressBar from '../../../utils/components/common/progressBar';

export default function MCQDModule() {
  const slug="mechanical_qa_list"
  const { data: content, isLoading, error, refetch } = useContent(slug);

  if (isLoading) return <ProgressBar />;
  if (error) return null; // or an error view

  return (
    <ContentNavigator
      content={content?.blocks ?? []}
    //   customComponents={CustomScreensList}
    //   customCards={CustomCardsList}
    />
  );
}
