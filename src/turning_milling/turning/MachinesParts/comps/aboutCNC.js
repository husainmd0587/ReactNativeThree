import React from 'react';
import PdfViewer from '../../../../utils/components/PdfViewer'

const AboutCNC = ({ navigation }) => {
  return (
    <PdfViewer
      navigation={navigation}
      title="Cnc Tools"
      pdfUrl="https://pub-9a09ee6126034c0c9cbd772d75056b70.r2.dev/turning%26milling/machineTools.pdf"
      footerText="Tool PDF"
    />
  );
};

export default AboutCNC;