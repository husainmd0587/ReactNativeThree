import ContentNavigator from '../mechanical_engineering/cms/contentNavigator'; 
import { CustomCardsList,CustomScreensList } from './customContent';
import { useContent } from  '../utils/api/hooks/useContent'
import ProgressBar from '../utils/components/common/progressBar';


export default function CNCDModule() {
  const slug="cnc"
  const { data: content, isLoading, error, refetch } = useContent(slug);

  if (isLoading) return <ProgressBar />;
  if (error) return null; // or an error view

  return (
    <ContentNavigator
      content={content?.blocks ?? []}
      customComponents={CustomScreensList}
      customCards={CustomCardsList}
    />
  );
}
