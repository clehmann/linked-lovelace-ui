import { DashboardCard, DashboardView } from '../types';

export const getTemplatesUsedInCard = (card: DashboardCard): string[] => {
  if (card.template) {
    return [card.template];
  }
  if (card.cards) {
    return card.cards.flatMap((c) => {
      return getTemplatesUsedInCard(c);
    });
  }
  if (card.card) {
    return getTemplatesUsedInCard(card.card)
  }
  return [];
};

export const getTemplatesUsedInView = (view: DashboardView): string[] => {
  return (
    view.cards?.flatMap((c) => {
      return getTemplatesUsedInCard(c);
    }) || []
  );
};

const replaceRegex = /(?<!\\)\$([^\$]+)(?!\\)\$/gm;

export const extractTemplateData = (data: DashboardCard): DashboardCard => {
  const dataFromTemplate = data.template_data || {};
  const template = JSON.stringify(data);
  template.replaceAll(replaceRegex, (substring, templateKey) => {
    if (dataFromTemplate[templateKey] === undefined) {
      dataFromTemplate[templateKey] = '';
    }
    return dataFromTemplate[templateKey] || substring;
  });
  data.template_data = { ...data.template_data, ...dataFromTemplate };
  if (Object.keys(data.template_data).length == 0) {
    delete data.template_data;
  }
  return data;
};

export const updateCardTemplate = (data: DashboardCard, templateData: Record<string, any> = {}): DashboardCard => {
  // Get key and data for template
  const templateKey = data.template;
  const dataFromTemplate: Record<string, any> | undefined = data.template_data;
  if (templateKey && templateData[templateKey]) {
    if (dataFromTemplate) {
      // If data in template, find and replace each key
      let template = JSON.stringify(templateData[templateKey]);
      template = template.replaceAll(replaceRegex, (substring, templateKey) => {
        if (dataFromTemplate[templateKey] === undefined) {
          dataFromTemplate[templateKey] = '';
        }
        return dataFromTemplate[templateKey] || substring;
      });
      try {
        // Convert rendered string back to JSON
        data = JSON.parse(template);
      } catch (e) {
        console.error(e);
        // Return original value if parse fails
        data = templateData[templateKey];
      }
      // Put template data back in card
      data = { ...{ template_data: dataFromTemplate, ...data }, template_data: dataFromTemplate };
    } else {
      // Put template value as new value
      data = templateData[templateKey];
    }
    // Put template key back in card
    data = { ...{ template: templateKey, ...data }, template: templateKey };
  } else {
    if (data.cards) {
      // Update any cards in the card
      const cards: DashboardCard[] = [];
      data.cards.forEach((card) => {
        if (dataFromTemplate) {
          // Pass template data down to children
          card.template_data = { ...(card.template_data || {}), ...dataFromTemplate };
        }
        cards.push(Object.assign({}, updateCardTemplate(card, templateData)));
      });
      data.cards = cards;
    }
    if (data.card) {
      if (dataFromTemplate) {
        // Pass template data down to children
        data.card.template_data = { ...(data.card.template_data || {}), ...dataFromTemplate };
      }
      data.card = Object.assign({}, updateCardTemplate(data.card, templateData));
    }
    // this handles all nested objects that may contain a template, like tap actions
    const cardKeys = Object.keys(data);
    const updatedData = {}
    cardKeys.forEach((cardKey) => {
      if (typeof data[cardKey] === 'object') {
        updatedData[cardKey] = updateCardTemplate(data[cardKey], templateData)
      }
    })
    Object.keys(updatedData).forEach((k) => {
      data[k] = updatedData[k]
    })
  }
  return data;
};
