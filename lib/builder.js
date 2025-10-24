
// builder.js - A basic example builder module
export function buildTemplate(template) {
    // 处理模板构建逻辑
    console.log('Building template:', template);
    // 模拟构建过程
    return { success: true, templateId: 'generated-template-id' };
}

export function validateTemplate(template) {
    // 校验模板的有效性
    if (!template.name || !template.questions) {
        throw new Error('Template must have a name and questions.');
    }
    console.log('Template validated:', template);
    return true;
}
