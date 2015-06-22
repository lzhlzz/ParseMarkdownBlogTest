
顶点缓存对象（Vertex Buffer Object，简称 VBO），允许开发者根据情况**把顶点数据放到显存**中。

如果不用 VBO，用 glVertexPointer / glNormalPointer 来指定顶点数据，这时顶点数据是放在系统内存中的，每次渲染时，都要把数据从系统内存拷贝到显存，消耗不少时间。

实际上很多拷贝都是不必要的，比如静态对象的顶点数据是不变的，如果能把它们放到显存里面，那么每次渲染时都不需要拷贝操作，可以节约不少时间。

# 1. 检查扩展

GL_ARB_vertex_buffer_object，是一个 OpenGL 的扩展，也就是 VBO。

为了使用此扩展，首先要检测当前的 OpenGL 版本是否支持此扩展。写一个函数如下，可用于检查任意扩展，参数是扩展名的字符串。

```cpp
int CheckExtension(char *extName)
{
    char *p = (char *)glGetString(GL_EXTENSIONS);
    char *end;
    int extNameLen = (int)strlen(extName);

    end = p + strlen(p);
    while (p < end) {
        int n = (int)strcspn(p, " ");
        if ((extNameLen == n) && (strncmp(extName, p, n) == 0)) {
            return TRUE;
        }
        p += (n + 1);
    }
    return FALSE;
}
```

然后，调用 CheckExtension 检测扩展是否存在，扩展名为 GL_ARB_vertex_buffer_object。如果扩展存在，再调用 wglGetProcAddress 分别获取所需的扩展函数的指针。例如： glGenBuffers、 glBindBuffer。

有时候，也会使用 glGenBuffersARB 这样的名称，以表示此函数是扩展库中的。在旧版本的 OpenGL 中常见到，新版本的 OpenGL 使用 glGenBuffers 这样去掉 ARB 的即可。

```cpp
if(CheckExtension("GL_ARB_vertex_buffer_object"))
{
    glGenBuffers = (PFNGLGENBUFFERSARBPROC) wglGetProcAddress("glGenBuffersARB");
    glBindBuffer = (PFNGLBINDBUFFERARBPROC) wglGetProcAddress("glBindBufferARB");
    glBufferData = (PFNGLBUFFERDATAARBPROC) wglGetProcAddress("glBufferDataARB");
    glBufferSubData = (PFNGLBUFFERSUBDATAARBPROC) wglGetProcAddress("glBufferSubDataARB");
    glDeleteBuffers = (PFNGLDELETEBUFFERSARBPROC) wglGetProcAddress("glDeleteBuffersARB");
}
else
{
    cout<<"ERROR: GL_ARB_vertex_buffer_object extension was not found"<<endl;
    return FALSE;
}
```

# 2. 创建顶点缓存对象

建立 VBO 需要三个步骤：

1. 创建缓存对象，使用 **glGenBuffers()**
2. 绑定缓存对象（指定使用哪一个缓存对象），使用 **glBindBuffer()**
3. 拷贝顶点数据到缓存对象中，使用 **glBufferData()**

三个函数的简介如下。

**void glGenBuffers(GLsizei n, GLuint* ids)**

创建缓存对象，并返回缓存对象的标识符。

* n - 创建缓存对象的数量。
* ids - 是一个 GLuint 型的变量或数组，用于储存缓存对象的单个 ID 或多个 ID。

**void glBindBuffer(GLenum target, GLuint id)**

一旦创建了缓存对象后，我们需要绑定缓存对象，以便使用。绑定，也就是指定当前要使用哪一个缓存对象。

target - 缓存对象要存储的数据类型，只有两个值： GL_ARRAY_BUFFER, 和 GL_ELEMENT_ARRAY_BUFFER。如果是顶点的相关属性，例如： 顶点坐标、纹理坐标、法线向量、颜色数组等，要使用 GL_ARRAY_BUFFER；索引数组，要使用 GL_ELEMENT_ARRAY_BUFFER，以便 **glDrawElements()** 使用。

id - 缓存对象的 ID。

**void glBufferData(GLenum target, GLsizei size, const void* data, GLenum usage)**

拷贝数据到缓存对象。

* target - 缓存对象的类型，只有两个值： GL_ARRAY_BUFFER 和 GL_ELEMENT_ARRAY_BUFFER。
* size - 数组 data 的大小，单位是字节(bytes)。
* data - 数组 data 的指针，如果指定为 NULL，则 VBO 只创建一个相应大小的缓存对象。
* usage - 缓存对象如何被使用，有三中： 静态的（static）、动态的（dynamic）和流（stream）。共有 9 个值：

```cpp
GL_STATIC_DRAW
GL_STATIC_READ
GL_STATIC_COPY
GL_DYNAMIC_DRAW
GL_DYNAMIC_READ
GL_DYNAMIC_COPY
GL_STREAM_DRAW
GL_STREAM_READ
GL_STREAM_COPY
```

老版本的 OpenGL 会加 ARB，变成形如 GL_STATIC_DRAW_ARB 的形式。

* Static 指在缓存对象中的数据不能够更改（设定一次，使用很多次）。
* Dynamic 指数据将会频繁地更改（反复设定和使用）。
* Stream 指的是每一帧数据都会更改（设定一次，使用一次）。
* Draw 指数据将会被送到 GPU 被用于绘制（application to GL）。
* Read 指数据将被读取到客户端应用程序（GL to application）。
* Copy 指数据将被用于绘制和读取（GL to GL）。

要注意，Draw 只对 VBO 有用； Copy 和 Read 只对 PBO（像素缓存对象） 和 FBO（帧缓存对象） 有意义。

VBO 内存管理器会根据标记选取适当的存储位置。

**void glBufferSubData(GLenum target, GLint offset, GLsizei size, void* data)**

与 glBufferData（） 一样，都是用于拷贝数据到缓存对象的。它能拷贝一段数据到一个**已经存在的缓存**，偏移量为 offset。

**void glDeleteBuffers(GLsizei n, const GLuint* ids)**

删除一个或多个缓存对象。

# 3. 顶点缓存和索引缓存的使用

有数据如下：

```cpp
GLfloat vertexs[] = { 0.0f, 0.0f, 0.0f, 0.2f, 0.0f, 0.0f,
                     -0.2f, 0.0f, 0.0f, 0.0f, 0.2f, 0.0f,
                     0.0f, -0.2f, 0.0f, 0.0f, 0.0f, 0.2f,
                     0.0f, 0.0f, -0.2f};

GLubyte indexs[] = {0,1,2,3,4,5,6};
```

生成缓存对象，并拷贝数据。

```cpp
GLuint vboVertexId;
GLuint vboIndexId;

glGenBuffers(1, &vboVertexId);
glBindBuffer(GL_ARRAY_BUFFER, vboVertexId);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertexs), vertexs, GL_STATIC_DRAW);

glGenBuffers(1, &vboIndexId);
glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, vboIndexId);
glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indexs), indexs, GL_STATIC_DRAW);
```

然后，在使用的时候，加入如下代码。

```cpp
glEnableClientState(GL_VERTEX_ARRAY);
glEnableClientState(GL_INDEX_ARRAY);

glBindBuffer(GL_ARRAY_BUFFER, vboVertexId);
glVertexPointer(3, GL_FLOAT, 0, 0);

glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, vboIndexId);
glIndexPointer(GL_UNSIGNED_BYTE, 0, 0);

... //绘制图形

glDisableClientState(GL_VERTEX_ARRAY); 
glDisableClientState(GL_INDEX_ARRAY);
glBindBuffer(GL_ARRAY_BUFFER, 0);
```

使用缓存对象的方法有三种：

```cpp
//1. 第一种
glBegin(GL_POINTS);
    glArrayElement(0);
    glArrayElement(1);
    glArrayElement(2);
    glArrayElement(5);
glEnd();

//2. 第二种
glDrawElements(GL_POINTS, 7, GL_UNSIGNED_BYTE, 0);

//3. 第三种
glDrawArrays(GL_POINTS,0,7);
```

# 4. 将不同类型的数据拷贝到一个缓存对象

用 glBufferSubData() 可以将几个数据拷贝到一个缓存对象中。例如，有以下数据：

```cpp
GLfloat vertexs[] = {0.0f, 0.0f, 0.0f, 0.2f, 0.0f, 0.0f,
                    -0.2f, 0.0f, 0.0f, 0.0f, 0.2f, 0.0f,
                    0.0f, -0.2f, 0.0f, 0.0f, 0.0f, 0.2f,
                    0.0f, 0.0f, -0.2f};

GLfloat colors[] = { 1.0f, 0.0f, 0.0f, 0.0f, 1.0f, 0.0f,
                    0.0f, 0.0f, 1.0f, 1.0f, 1.0f, 0.0f,
                    0.0f, 1.0f, 1.0f, 1.0f, 0.0f, 1.0f,
                    0.0f, 0.0f, 0.0f};
```

现在，要将两个数组存在同一个缓存对象中，顶点数组在前，颜色数组在后。代码如下：

```cpp
glGenBuffers(1, &vboVertexId);
glBindBuffer(GL_ARRAY_BUFFER, vboVertexId);
glBufferData(GL_ARRAY_BUFFER, sizeof(vertexs)+sizeof(colors), 0, GL_STATIC_DRAW);
glBufferSubData(GL_ARRAY_BUFFER, 0, sizeof(vertexs) , vertexs);     //注意第三个参数，偏移量
glBufferSubData(GL_ARRAY_BUFFER, sizeof(vertexs), sizeof(colors), colors);
```

创建好缓存对象后，要用 glVertexPointer 和 glColorPointer 指定相应的指针位置。但是，由于 glColorPointer 的最后一个参数，必须是指针类型。请看下面的代码，glColorPointer 的最后一个参数用偏移量指示了颜色数组的位置。

```cpp
glEnableClientState(GL_VERTEX_ARRAY);
glEnableClientState(GL_COLOR_ARRAY);
glEnableClientState(GL_INDEX_ARRAY);

glBindBuffer(GL_ARRAY_BUFFER, vboVertexId);
glVertexPointer(3, GL_FLOAT, 0, 0);
glColorPointer(3,GL_FLOAT,0,(void*)sizeof(vertexs));    //注意最后一个参数

glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, vboIndexId);
glIndexPointer(GL_UNSIGNED_BYTE, 0, 0);

glDrawArrays(GL_POINTS,0,7);
        
glDisableClientState(GL_VERTEX_ARRAY); 
glDisableClientState(GL_COLOR_ARRAY); 
glDisableClientState(GL_INDEX_ARRAY);
glBindBuffer(GL_ARRAY_BUFFER, 0);
```

# 5. 修改缓存对象

比起显示列表，VBO 一个很大的优点是能够读取和修改缓存对象的数据。最简单的方法是重新拷贝虽有数据到 VBO，利用 glBufferData() 和 glBufferSubData()，这种情况下，你的程序必须要保存有两份数据：一份在客户端（CPU），一份在设备端（GPU）。

另一种方法，是将缓存对象映射到客户端，再通过指针修改数据。

**void* glMapBuffer(GLenum target, GLenum access)**

映射当前绑定的缓存对象到客户端，glMapBuffer 返回一个指针，指向缓存对象。如果 OpenGL 不支持，则返回 NULL。

* target - GL_ARRAY_BUFFER 或 GL_ELEMENT_ARRAY_BUFFER。
* access - 的值有三个 GL_READ_ONLY、 GL_WRITE_ONLY、 GL_READ_WRITE，分别表示只读、只写、可读可写。

如果 OpenGL 正在操作缓存对象，此函数不会成功，直到 OpenGL 处理完毕为止。为了避免等待，可以先用 glBindBuffer(GL_ARRAY_BUFFER, 0) 停止缓存对象的应用，再调用 glMapBuffer。

**GLboolean glUnmapBuffer(GLenum target)**

修改完数据后，将数据反映射到设备端。

使用方法见如下代码。

```cpp
glBindBuffer(GL_ARRAY_BUFFER, vboVertexId);
GLfloat* ptr = (float*)glMapBuffer(GL_ARRAY_BUFFER, GL_WRITE_ONLY);

if(ptr)
{
    ptr[0] = 0.2f;  ptr[1] = 0.2f;  ptr[2] = 0.2f;
    glUnmapBuffer(GL_ARRAY_BUFFER);
}

glBindBuffer(GL_ARRAY_BUFFER, 0);
```

# 参考资料

[[1] 关于GL_ARB_vertex_buffer_object扩展](http://dev.gameres.com/Program/Visual/3D/vbo.htm)

[[2] OpenGL Vertex Buffer Object (VBO)](http://www.songho.ca/opengl/gl_vbo.html)
