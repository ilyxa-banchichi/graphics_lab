import type {LessonId} from './catalog';
import type {PipelineDemoKind} from './PipelineDemos';
type Visual='alpha'|'attributes'|'cover'|'depth'|'fragments'|'framebuffer'|'material'|'matrices'|'meshBuffers'|'ndc'|'next'|'normal'|'outputFlow'|'pipeline'|'primitiveFlow'|'resources'|'rgb'|'shader'|'spaces'|'uv'|'weights';
export type Slide={kind:'slide';key:string;section:LessonId;title:string;lead:string;visual:Visual;points:string[];terms:string[]};
type Demonstration={kind:'demo';key:string;section:LessonId;title:string;demo:PipelineDemoKind;terms:string[]};
export type LectureStep=Slide|Demonstration;
export const lecture:LectureStep[]=[
  {
    "kind": "slide",
    "key": "lecture/I00/intro",
    "section": "I00",
    "title": "Как GPU превращает данные в изображение",
    "lead": "Проследим один треугольник от модели до кадра",
    "visual": "cover",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/I00/scene",
    "section": "I00",
    "title": "Готовая сцена и выбранный треугольник",
    "demo": "overview",
    "terms": [
      "Triangle",
      "Frame"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/I00/pipeline",
    "section": "I00",
    "title": "Графический конвейер",
    "lead": "Этапы графического конвейера с растеризацией",
    "visual": "pipeline",
    "terms": [],
    "points": []
  },
  {
    "kind": "slide",
    "key": "lecture/G00/resources",
    "section": "G00",
    "title": "Ресурсы GPU",
    "lead": "Приложение готовит данные, GPU их читает",
    "visual": "resources",
    "terms": [],
    "points": []
  },
  {
    "kind": "slide",
    "key": "lecture/G00/mesh",
    "section": "G00",
    "title": "Mesh: форма из треугольников",
    "lead": "Вершины хранят положения, индексы собирают из них треугольники",
    "visual": "meshBuffers",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/G00/data",
    "section": "G00",
    "title": "Вершинный и индексный буферы",
    "demo": "data",
    "terms": [
      "Vertex Buffer",
      "Index Buffer"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/G00/attributes",
    "section": "G00",
    "title": "Атрибуты вершины",
    "lead": "Кроме положения, вершина хранит данные для следующих стадий",
    "visual": "attributes",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/V00/rig",
    "section": "V00",
    "title": "Камера смотрит на куб",
    "demo": "rig",
    "terms": [
      "Camera",
      "Frustum"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/V00/spaces",
    "section": "V00",
    "title": "Пространства координат",
    "lead": "Каждое пространство — своя точка отсчёта. Матрица переводит из одного в другое",
    "visual": "spaces",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/V00/spaces-show",
    "section": "V00",
    "title": "Путь вершины через пространства",
    "demo": "spaces",
    "terms": [
      "Object Space",
      "World Space",
      "View Space"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/V00/camera",
    "section": "V00",
    "title": "Камера и матрицы",
    "lead": "Камера задаёт две матрицы, модель — третью",
    "visual": "matrices",
    "terms": [],
    "points": []
  },
  {
    "kind": "slide",
    "key": "lecture/V00/shader",
    "section": "V00",
    "title": "Vertex Shader",
    "lead": "Программа, которая выполняет это преобразование для каждой вершины",
    "visual": "shader",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/V00/transform",
    "section": "V00",
    "title": "Вершинный шейдер: вход и выход",
    "demo": "vertex",
    "terms": [
      "Vertex Shader",
      "Clip Space"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/P00/assembly",
    "section": "P00",
    "title": "Из трёх вершин — контур на экране",
    "lead": "Теперь обрабатываем треугольник целиком",
    "visual": "primitiveFlow",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/P00/clip-show",
    "section": "P00",
    "title": "Отсечение треугольника",
    "demo": "clipping",
    "terms": [
      "Clipping",
      "Near Plane"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/P00/viewport",
    "section": "P00",
    "title": "Деление на w и Viewport",
    "lead": "Пирамида видимости становится кубом, куб растягивается на окно",
    "visual": "ndc",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/P00/viewport-show",
    "section": "P00",
    "title": "Координаты окна",
    "demo": "viewport",
    "terms": [
      "NDC",
      "Viewport Transform"
    ]
  },
  {
    "kind": "demo",
    "key": "lecture/P00/culling-show",
    "section": "P00",
    "title": "Отбраковка задних сторон",
    "demo": "culling",
    "terms": [
      "Face Culling",
      "Winding Order"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/R00/coverage",
    "section": "R00",
    "title": "От контура к фрагментам",
    "lead": "Непрерывный треугольник превращается в набор покрытых точек сетки",
    "visual": "fragments",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/R00/coverage-show",
    "section": "R00",
    "title": "Какие выборки покрыты",
    "demo": "raster",
    "terms": [
      "Coverage",
      "Fragment"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/R00/weights",
    "section": "R00",
    "title": "Значения между вершинами",
    "lead": "Три веса распределяют вклад данных A, B и C",
    "visual": "weights",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/R00/interpolation-show",
    "section": "R00",
    "title": "Цвет и UV между вершинами",
    "demo": "interpolation",
    "terms": [
      "Interpolation",
      "Barycentric"
    ]
  },
  {
    "kind": "demo",
    "key": "lecture/R00/perspective-show",
    "section": "R00",
    "title": "Перспективная поправка",
    "demo": "perspective",
    "terms": [
      "Perspective-correct Interpolation"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/F00/shader",
    "section": "F00",
    "title": "Fragment Shader",
    "lead": "Программа вычисляет цвет каждого фрагмента",
    "visual": "shader",
    "terms": [],
    "points": []
  },
  {
    "kind": "slide",
    "key": "lecture/F00/rgb",
    "section": "F00",
    "title": "RGB и RGBA",
    "lead": "Числа представляют цвет результата",
    "visual": "rgb",
    "terms": [
      "RGB",
      "Alpha"
    ],
    "points": [
      "В опытах каналы считаем в линейных значениях от 0 до 1.",
      "Alpha понадобится позже для выбранного смешивания."
    ]
  },
  {
    "kind": "demo",
    "key": "lecture/F00/shader-show",
    "section": "F00",
    "title": "Одна программа — разные входы",
    "demo": "fragment",
    "terms": [
      "Fragment Shader",
      "Uniform"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/F00/texture",
    "section": "F00",
    "title": "Текстура и сэмплер",
    "lead": "Шейдер читает текстуру по адресу UV",
    "visual": "uv",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/F00/texture-show",
    "section": "F00",
    "title": "Рисунок на треугольнике",
    "demo": "texture",
    "terms": [
      "UV",
      "Texture Sampling"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/F00/light",
    "section": "F00",
    "title": "Нормаль и освещение",
    "lead": "Яркость зависит от угла между нормалью и светом",
    "visual": "normal",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/F00/light-show",
    "section": "F00",
    "title": "Свет и нормали",
    "demo": "lighting",
    "terms": [
      "Normal Interpolation",
      "Normalize"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/F00/material",
    "section": "F00",
    "title": "Материал",
    "lead": "Материал — шейдер плюс значения его свойств",
    "visual": "material",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/F00/material-show",
    "section": "F00",
    "title": "Материал на сфере",
    "demo": "material",
    "terms": [
      "Roughness",
      "Metallic"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/O00/flow",
    "section": "O00",
    "title": "После фрагментного шейдера",
    "lead": "Фрагмент проходит проверки и записывается в буферы",
    "visual": "outputFlow",
    "terms": [],
    "points": []
  },
  {
    "kind": "slide",
    "key": "lecture/O00/depth",
    "section": "O00",
    "title": "Depth Test и Depth Buffer",
    "lead": "Глубина решает, какая поверхность ближе",
    "visual": "depth",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/O00/depth-show",
    "section": "O00",
    "title": "Перекрывающиеся треугольники",
    "demo": "depth",
    "terms": [
      "LESS",
      "Depth Write"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/O00/blend",
    "section": "O00",
    "title": "Alpha Blending",
    "lead": "Новый цвет смешивается с цветом в буфере",
    "visual": "alpha",
    "terms": [],
    "points": []
  },
  {
    "kind": "demo",
    "key": "lecture/O00/blend-show",
    "section": "O00",
    "title": "Порядок прозрачных слоёв",
    "demo": "blending",
    "terms": [
      "Alpha",
      "Depth Test",
      "Depth Write"
    ]
  },
  {
    "kind": "slide",
    "key": "lecture/O00/buffers",
    "section": "O00",
    "title": "Framebuffer",
    "lead": "Цвет и глубина — два изображения одного кадра",
    "visual": "framebuffer",
    "terms": [],
    "points": []
  },
  {
    "kind": "slide",
    "key": "lecture/Z00/trace",
    "section": "Z00",
    "title": "Итог: графический конвейер",
    "lead": "Путь треугольника A–B–C от вершин в буфере до цвета в кадре",
    "visual": "pipeline",
    "terms": [],
    "points": []
  },
  {
    "kind": "slide",
    "key": "lecture/Z00/next",
    "section": "Z00",
    "title": "Что дальше",
    "lead": "От одного треугольника — к целому кадру",
    "visual": "next",
    "terms": [],
    "points": []
  }
];
export const firstStep=(section:LessonId)=>lecture.find(step=>step.section===section)!;
