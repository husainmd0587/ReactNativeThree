// components/BlockRenderer.jsx
import React, { useRef } from 'react';
import {View } from 'react-native';

import Carousel from './UIComponents/carosel.js';
import Alert from './UIComponents/Alert.js';
import IntroCard from './UIComponents/IntroCard.js';
import ResourceList from './UIComponents/ResourceList.js';
import Outcomes from './UIComponents/Outcomes.js';
import SectionsList from './UIComponents/SectionsList.js';
import {Heading,Paragraph } from './UIComponents/Typography.js';
import Hero from './UIComponents/Hero.js';
import Image from './UIComponents/Image.js';
import Video from './UIComponents/Video.js'
import Workshop3DModal from './UIComponents/Workshop3DModal.js';
import List from './UIComponents/List.js';
import Note from './UIComponents/Note.js';
import Banner from './UIComponents/Banner.js';
import PDF from './UIComponents/PDF.js';
import Items from './UIComponents/Items.js';
import Table from './UIComponents/Table.js'
import Formula    from './UIComponents/Formula.js'
import Steps      from './UIComponents/Steps.js'
import KeyValue   from './UIComponents/KeyValue.js'
import Comparison from './UIComponents/Comparison.js'
import Diagram    from './UIComponents/Diagram.js'
import Qa from './UIComponents/Qa.js'
import Mcq from './UIComponents/Mcq.js'
import Callout     from './UIComponents/Callout.js'
import BadgeRow    from './UIComponents/BadgeRow.js'
import ProgressBar from './UIComponents/ProgressBar.js'
import Timeline    from './UIComponents/Timeline.js'
import SpecCard    from './UIComponents/SpecCard.js'
import Tabs        from './UIComponents/Tabs.js'
import GDTSymbolCard from './UIComponents/GDTSymbolCard.js';
import ModifierCard from './UIComponents/ModifierCard.js';

import LineSampleCard from './UIComponents/LineSampleCard.js';
import SymbolGlossaryCard from './UIComponents/SymbolGlossaryCard.js';
import FitCard from './UIComponents/FitCard.js';
import EngineeringDiagram from './UIComponents/EngineeringDiagram.js';
import QuestionAnswerBlock from './UIComponents/QuestionAnswerBlock.js'
import { findItemByPath } from '../utils/findItemById.js';

// ─── Main Renderer ────────────────────────────────────────────
// BlockRenderer.js


const BlockRenderer = ({
  blocks = [],
  navigation,
  accent = '#D9534F',
  rootBlocks,
  customCards = {},
  customComponents = [],
}) => {
const _root = rootBlocks || blocks;
  return (
    <View>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'carousel':
              return (
                <Carousel
                  key={index}
                  items={block.items}
                  caroselConfig={block.caroselConfig}
                  activeDotColor="#FF6B6B"
                  inactiveDotColor="rgba(255,107,107,0.3)"
                  onItemPress={(item) => {

                    // Custom Screen
                    if (item.navigation) {
                      navigation.navigate(item.navigation, {
                        item,
                      });
                      return;
                    }

                    // Normal Workshop Page
                    if (item.target) {
                      const page = findItemByPath(_root, item.target);

                      if (page) {
                        navigation.navigate("ItemScreen", {
                          item: page,
                          rootBlocks: _root,
                          accent,
                        });
                      }
                    }
                  }}
                />
              );
          case 'alert':
            return (
              <Alert
                key={index}
                icon={block.icon}
                title={block.title}
                text={block.text}
                accent={block.accent || accent}
                accentBg={block.accentBg}
              />
            );
          
          case 'intro_card':
            return (
              <IntroCard
                key={index} 
                title={block.title}
                text={block.text}
                thumbnail={block.thumbnail}
                readMoreItem={block.readMoreItem}
                pdfUrl={block.pdfUrl}
                accent={block.accent || accent}
                navigation={navigation}
              />
            );
          
          case 'resource_list':
            return (
              <ResourceList
                key={index}
                title={block.title}
                items={block.items}
                viewAllItem={block.viewAllItem}
                accent={accent}
                navigation={navigation}
              />
            );
          
          case 'outcomes':
            return (
              <Outcomes
                key={index}
                title={block.title}
                items={block.items}
                accent={accent}
              />
            );
          
          case 'sections_list':
            return (
              <SectionsList
                key={index}
                title={block.title}
                items={block.items}
                accent={accent}
                navigation={navigation}
               
              />
            );
          
          case 'items':
            return (
              <Items
                key={index}
                title={block.title}
                items={block.items}
                navigation={navigation}
              />
            );
          
          case 'hero':
            return (
              <Hero
                key={index}
                thumbnail={block.thumbnail}
                videoUrl={block.videoUrl}
                modelUrl={block.modelUrl}
                title={block.title}
                subtitle={block.subtitle}
              />
            );

          case 'heading':
            return <Heading key={index} text={block.text} />;
          
          case 'paragraph':
            return <Paragraph key={index} text={block.text} />;
          
          case 'image':
            return (
              <Image
                key={index}
                imageUrl={block.image}
                caption={block.caption}
              />
            );
          
          case 'video':
            return(
                <Video
                    key={index}
                    title={block.title}
                    url={block.url}
              />);

          case 'modal3D' :
            return(
              <Workshop3DModal
               key={index}
               title={block.title} 
               subtitle={block.subtitle} 
               modelUrl={block.url}
               materialConfig={block.materialConfig}
               soundUrl={block.soundUrl}
              />
            );

          case 'list':
            return (
              <List
                key={index}
                title={block.title}
                items={block.items}
                listIcon={block.listIcon}
              />
            );
          
          case 'note':
            return (
              <Note
                key={index}
                text={block.text}
                variant={block.variant}
              />
            );
          
          case 'banner':
            return <Banner key={index} text={block.text} />;
          
          case 'pdf':
            return (
              <PDF
                key={index}
                navigation={navigation}
                url={block.url}
                title={block.title}
              />
            );
          
          case "table":
             return (
             <Table
              key={index}
              headers={block.headers}
              rows={block.rows}
               />);
          case 'formula':
            return (
              <Formula
                key={index}
                expression={block.expression}
                variables={block.variables}
              />
            );
          case 'steps':
            return (
              <Steps
                key={index}
                title={block.title}
                steps={block.steps}
              />
            );
          case 'keyvalue':
            return (
              <KeyValue
                key={index}
                title={block.title}
                items={block.items}
              />
            );

          case 'comparison':
            return (
              <Comparison
                key={index}
                title={block.title}
                left={block.left}
                right={block.right}
              />
            );

          case 'diagram':
            return (
              <Diagram
                key={index}
                title={block.title}
                width={block.width}
                height={block.height}
                shapes={block.shapes}
              />
            );
          case 'callout':
            return (
              <Callout
                key={index}
                term={block.term}
                definition={block.definition}
                example={block.example}
                variant={block.variant}
              />
            );

          case 'badge_row':
            return (
              <BadgeRow
                key={index}
                title={block.title}
                badges={block.badges}
              />
            );

          case 'progress_bar':
            return (
              <ProgressBar
                key={index}
                title={block.title}
                items={block.items}
              />
            );

          case 'timeline':
            return (
              <Timeline
                key={index}
                title={block.title}
                items={block.items}
              />
            );

          case 'spec_card':
            return (
              <SpecCard
                key={index}
                title={block.title}
                icon={block.icon}
                specs={block.specs}
              />
            );

          case 'tabs':
            return (
              <Tabs
                key={index}
                tabs={block.tabs}
                navigation={navigation}
                accent={accent}
                rootBlocks={rootBlocks}
                renderBlocks={(childBlocks, childNavigation, childAccent, childRootBlocks) => (
                  <BlockRenderer
                    blocks={childBlocks}
                    navigation={childNavigation}
                    accent={childAccent}
                    rootBlocks={childRootBlocks}
                  />
                )}
              />
            );
          case 'mcq' :
            return (
              <Mcq 
               key={index}
               title={block.title}
              questions={block.questions}
              />
            );
          case 'qa' :
            return(
              <Qa
               key={index}
               title={block.title}
              questions={block.questions}
              />
            );
          case 'gdt_symbol':
  return (
    <GDTSymbolCard
      key={index}
      symbol={block.symbol}
      name={block.name}
      categoryColor={block.categoryColor || accent}
      requiresDatum={block.requiresDatum}
      deprecated={block.deprecated}
      isKeySymbol={block.isKeySymbol}
      description={block.description}
      tolerance={block.tolerance}
      application={block.application}
      example={block.example}
      datumNote={block.datumNote}
      details={block.details}
      relatedSymbols={block.relatedSymbols}
    />
  );
          case 'modifier':
            return (
              <ModifierCard
                key={index}
                symbol={block.symbol}
                name={block.name}
                short={block.short}
                description={block.description}
                color={block.color || accent}
              />
            );
          case 'line_sample':
            return <LineSampleCard key={index} symbol={block.symbol} title={block.title} desc={block.desc} color={block.color} />;

          case 'symbol_glossary':
            return (
              <SymbolGlossaryCard
                key={index}
                category={block.category}
                symbol={block.symbol}
                title={block.title}
                about={block.about}
                color={block.color}
              />
            );

          case 'fit_card':
            return (
              <FitCard
                key={index}
                title={block.title}
                emoji={block.emoji}
                color={block.color}
                description={block.description}
                shaftRange={block.shaftRange}
                holeRange={block.holeRange}
                uses={block.uses}
              />
            );

          case 'engineering_diagram':
            return (
              <EngineeringDiagram
                key={index}
                title={block.title}
                diagramType={block.diagramType}
                width={block.width}
              />
            );
          case "custom_card": {
               const card = customCards[block.id];
                if (!card || !card.component) return null;
                
                const Card = card.component;
                return (
                  <Card
                    navigation={navigation}
                    key={index}
                    block={block}
                  />
                )};
          case 'qa_list':
                   return (<QuestionAnswerBlock key={index} block={block} />); 
           default:  return null;
                  }})}
              </View>
            );
};

export default BlockRenderer;