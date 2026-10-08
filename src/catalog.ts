export const lessons=[
{id:'I00',tag:'Обзор',title:'Введение'},
{id:'G00',tag:'Приложение / ресурсы',title:'Подготовка данных'},
{id:'V00',tag:'Vertex Processing',title:'Обработка вершин'},
{id:'P00',tag:'Primitive Processing',title:'Обработка примитивов'},
{id:'R00',tag:'Rasterization',title:'Растеризация'},
{id:'F00',tag:'Fragment Processing',title:'Обработка фрагментов'},
{id:'O00',tag:'Depth / Blending',title:'Depth и Blending'},
{id:'Z00',tag:'Итог',title:'Итог'}
] as const;
export type LessonId=typeof lessons[number]['id'];
