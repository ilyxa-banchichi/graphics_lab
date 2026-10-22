export const frameGroups=[
{id:'frame',tag:'Кадр',title:'От сцены к изображению'},
{id:'commands',tag:'CPU → GPU',title:'Команды и видимость'},
{id:'targets',tag:'Pass / Target',title:'Проходы и ресурсы'},
{id:'shadows',tag:'Shadow Map',title:'Тени'},
{id:'order',tag:'Depth / Alpha',title:'Порядок отрисовки'},
{id:'paths',tag:'Forward / Deferred',title:'Пути освещения'},
{id:'post',tag:'HDR / Bloom',title:'Постобработка'},
{id:'graph',tag:'Dependencies',title:'Граф кадра'},
{id:'engine',tag:'Unity / SRP',title:'Организация рендеринга'}
] as const;
export type FrameGroup=typeof frameGroups[number]['id'];
export type FrameDemoKind='frame'|'commands'|'targets'|'shadows'|'opaque'|'transparent'|'gbuffer'|'lights'|'bloom'|'post-order'|'graph'|'debugger'|'cost';
export type RenderSlide={kind:'render-slide';key:string;section:FrameGroup;title:string;lead:string;terms:string[];flow?:string[];rows?:string[][];code?:string;points:string[];visual?:'paths'|'shadow'|'bloom'|'graph'|'srp'};
export type RenderDemo={kind:'render-demo';key:string;section:FrameGroup;title:string;demo:FrameDemoKind};
export type RenderStep=RenderSlide|RenderDemo;
function slide(section:FrameGroup,id:string,title:string,lead:string,terms:string[],rest:Omit<RenderSlide,'kind'|'key'|'section'|'title'|'lead'|'terms'|'points'>&{points?:string[]}={}):RenderSlide{return {kind:'render-slide',key:`frame/${section}/${id}`,section,title,lead,terms,points:[],...rest}}
function demo(section:FrameGroup,id:string,title:string,kind:FrameDemoKind):RenderDemo{return {kind:'render-demo',key:`frame/${section}/${id}`,section,title,demo:kind}}
export const frameSteps:RenderStep[]=[
slide('frame','overview','Как собирается кадр','Одна сцена, несколько задач и промежуточных изображений',['Render Pipeline','Frame'],{flow:['Сцена','Проходы','Ресурсы','Изображение'],points:['Куб, сфера, светящийся объект и прозрачные поверхности.','Каждый эффект появляется на определённом этапе.']}),
demo('frame','explore','Кадр по шагам','frame'),
slide('frame','levels','Два уровня конвейера','GPU обрабатывает геометрию. Render Pipeline организует кадр.',['Graphics Pipeline','Render Pipeline'],{rows:[['Уровень','Решаемая задача'],['Графический конвейер GPU','Вершины → растеризация → фрагменты → запись'],['Организация кадра','Что рисовать, в каком порядке и в какие ресурсы']],points:['Один объект может участвовать в нескольких проходах.']}),
slide('commands','draw','Команда отрисовки','Геометрия, программа, параметры и состояние должны встретиться',['Draw Call','Render State','Command Buffer'],{flow:['Target + Viewport','Shader + Resources','Depth + Blend','Draw'],code:'SetRenderTarget(sceneColor, cameraDepth)\nSetPipelineState(shader, depth, blend)\nBind(mesh, material, camera)\nDrawIndexed(indexCount)',points:['Условная последовательность команд, а не готовый API конкретного движка.']}),
demo('commands','instances','Объекты и draw calls','commands'),
slide('commands','visibility','Видимость зависит от задачи','Камера и источник света могут нуждаться в разных объектах',['Frustum Culling','Shadow Caster','Sorting'],{rows:[['Набор','Критерий отбора'],['Изображение камеры','Попадает ли объект в область камеры'],['Карта теней','Может ли объект заслонять свет']],points:['Невидимый камерой объект всё ещё может отбрасывать видимую тень.','Отбор объектов отличается от проверки глубины их фрагментов.']}),
slide('targets','pass','Проход рендеринга','Задача над выбранными ресурсами с определённым состоянием',['Render Pass','Input','Output'],{flow:['Входные ресурсы','Команды прохода','Выходные ресурсы'],rows:[['Проход','Что делает'],['Shadow Map','Записывает глубину со стороны света'],['Opaque','Рисует непрозрачную геометрию'],['Blur','Читает одну текстуру и записывает другую']],points:['Проход может содержать много draw calls. Полноэкранная операция тоже может быть проходом.']}),
demo('targets','inspect','Цвет, глубина и промежуточные текстуры','targets'),
slide('targets','lifetime','Что происходит с содержимым target','Ресурс, его начальные значения и срок жизни — часть алгоритма',['Render Target','Attachment','Clear','Load / Store'],{rows:[['Действие','Смысл'],['Clear','Начать с известного значения'],['Load','Сохранить предыдущие данные для продолжения'],['Store','Сохранить результат для последующего использования']],points:['Размер и формат определяют точность и объём памяти.','Не очищайте глубину между непрозрачными и прозрачными объектами, если нужна общая видимость.']}),
slide('shadows','principle','Тень как проверка видимости света','Сначала смотрим на сцену со стороны источника',['Shadow Map','Light Space','Depth Comparison'],{visual:'shadow',flow:['Камера света','Shadow Depth','Камера игрока','Сравнение глубины'],points:['Карта теней хранит ближайшую к свету поверхность.','Фрагмент в тени, если между ним и светом уже есть другая поверхность.']}),
demo('shadows','map','Карта теней и её применение','shadows'),
slide('shadows','precision','Разрешение и bias','У карты теней конечная точность',['Shadow Acne','Bias','Shadow Resolution'],{rows:[['Настройка','Наблюдаемый результат'],['Мало texels','Ступенчатый край тени'],['Слишком малый bias','Ложное самозатенение'],['Слишком большой bias','Тень отрывается от объекта']],points:['Повышение разрешения требует памяти и дополнительной работы.','Одноточечное сравнение оставлено видимым: фильтрация скрыла бы часть эффекта.']}),
slide('order','queues','Порядок влияет на результат и стоимость','Непрозрачные и прозрачные поверхности решают разные задачи',['Opaque','Transparent','Depth Write'],{rows:[['Группа','Типичная организация'],['Непрозрачные','Проверка и запись глубины, группировка по состоянию'],['Прозрачные','После непрозрачных; для обычного alpha blending — дальние раньше ближних']],points:['Порядок объектов не решает все случаи пересекающейся прозрачной геометрии.']}),
demo('order','opaque','Сохранённая глубина непрозрачной сцены','opaque'),
demo('order','transparent','Два прозрачных слоя','transparent'),
slide('paths','compare','Forward и Deferred','Где выполняется освещение и какие данные сохраняются',['Forward','Deferred','G-buffer','Forward+'],{visual:'paths',rows:[['Forward','Deferred'],['Геометрия и свет → Scene Color','Геометрия → G-buffer → освещение'],['Свет вычисляется при отрисовке поверхности','Свет читает данные видимой поверхности']],points:['Forward+ отбирает источники света по пространственным областям.','Путь освещения не задаёт всю последовательность эффектов кадра.']}),
demo('paths','gbuffer','Данные поверхности до освещения','gbuffer'),
demo('paths','lights','Одна сцена и несколько источников','lights'),
slide('paths','tradeoffs','Выбор зависит от сцены и оборудования','Больше проходов не означает автоматически медленнее',['Bandwidth','Overdraw','MSAA'],{rows:[['Условие','Что проверить'],['Много источников','Стоимость отбора и вычисления света'],['G-buffer','Память, форматы и пропускную способность'],['Прозрачность','Отдельный путь и порядок'],['Целевое устройство','GPU-время и ограничения платформы']],points:['Число draw calls само по себе не определяет скорость.']}),
slide('post','hdr','Постобработка читает изображение','Яркость в рабочих буферах может превышать единицу',['HDR','Tone Mapping','Bloom'],{flow:['Scene Color HDR','Bright Extract','Blur','Composite','Tone Mapping'],points:['HDR — диапазон данных, bloom — эффект, tone mapping — преобразование для вывода.','Светящийся материал и свечение вокруг него — разные вещи.']}),
demo('post','bloom','Сборка bloom','bloom'),
slide('post','pingpong','Отдельный ресурс для результата','Каждый шаг читает завершённый вход и пишет в другой target',['Ping-Pong','Fullscreen Pass','Downsample'],{visual:'bloom',flow:['Bright','Blur A · X','Blur B · Y','Scene + Blur B'],code:'Bright = Extract(SceneColor)\nBlurA = BlurX(Bright)\nBlurB = BlurY(BlurA)\nDisplay = ToneMap(SceneColor + k * BlurB)',points:['Нельзя обычной выборкой читать текстуру, одновременно прикреплённую для записи.']}),
demo('post','ui','UI до и после постобработки','post-order'),
slide('graph','dependencies','Кадр как граф зависимостей','Связи задаются ресурсами, которые читают и записывают проходы',['Render Graph','Read','Write','Resource Lifetime'],{visual:'graph',flow:['Shadow → Opaque','Opaque → Transparent','Scene → Bloom','Scene + Bloom → Display'],points:['Потребитель должен получить готовый результат производителя.','Независимость задач ещё не гарантирует параллельное выполнение.']}),
demo('graph','explore','Удалить эффект и проследить зависимости','graph'),
slide('engine','srp','Scriptable Render Pipeline','Код движка организует работу GPU',['SRP','URP','HDRP'],{visual:'srp',flow:['Culling','Rendering Data','Render Passes','Commands','GPU'],points:['URP и HDRP — готовые реализации на основе SRP.','HLSL задаёт вычисления шейдера; C# и API рендеринга организуют проходы.']}),
slide('engine','urp','Где добавляется свой проход в URP','От настройки рендерера к объявлению ресурсов и команд',['Renderer Feature','ScriptableRenderPass','RecordRenderGraph'],{rows:[['Узел','Назначение'],['URP Asset / Renderer','Выбор конфигурации рендеринга'],['Renderer Feature','Подключение дополнительной возможности'],['ScriptableRenderPass','Точка включения задачи'],['Render Graph','Объявление чтения, записи и выполнения']],points:['RenderPassEvent задаёт место включения, зависимости ресурсов задают корректность.','Ориентир: Unity 6.0 / URP 17, Render Graph включён.']}),
demo('engine','events','Разбор событий кадра','debugger'),
demo('engine','cost','Работа кадра и размеры ресурсов','cost'),
slide('engine','recap','Прочитать кадр по его ресурсам','Для каждого результата найдите проход, входы и команды',['Draw Call','Render Pass','Render Target','Render Graph'],{flow:['Shadow Depth','Scene Color + Depth','Transparent','Bloom','Display + UI'],points:['Что исчезнет, если убрать карту теней?','Почему bloom нужен отдельный ресурс?','Какие объекты рисовались больше одного раза?']})
];
