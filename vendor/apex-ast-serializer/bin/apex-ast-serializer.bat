@if "%DEBUG%" == "" @echo off
@rem ##########################################################################
@rem
@rem  apex-ast-serializer startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%..

@rem Add default JVM options here. You can also use JAVA_OPTS and APEX_AST_SERIALIZER_OPTS to pass JVM options to this script.
set DEFAULT_JVM_OPTS=

@rem Find java.exe
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if "%ERRORLEVEL%" == "0" goto init

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto init

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:init
@rem Get command-line arguments, handling Windows variants

if not "%OS%" == "Windows_NT" goto win9xME_args

:win9xME_args
@rem Slurp the command line arguments.
set CMD_LINE_ARGS=
set _SKIP=2

:win9xME_args_slurp
if "x%~1" == "x" goto execute

set CMD_LINE_ARGS=%*

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\lib\apex-ast-serializer-1.0-SNAPSHOT.jar;%APP_HOME%\lib\apex-jorje-lsp.jar;%APP_HOME%\lib\xstream-1.4.14.jar;%APP_HOME%\lib\jersey-media-json-jackson-3.0.0.jar;%APP_HOME%\lib\jaxb-api-2.3.1.jar;%APP_HOME%\lib\slf4j-simple-1.7.30.jar;%APP_HOME%\lib\jersey-container-jetty-http-3.0.0.jar;%APP_HOME%\lib\jetty-servlet-11.0.0.jar;%APP_HOME%\lib\jetty-security-11.0.0.jar;%APP_HOME%\lib\jetty-server-11.0.0.jar;%APP_HOME%\lib\jetty-http-11.0.0.jar;%APP_HOME%\lib\jetty-io-11.0.0.jar;%APP_HOME%\lib\jetty-util-11.0.0.jar;%APP_HOME%\lib\slf4j-api-2.0.0-alpha1.jar;%APP_HOME%\lib\jersey-container-servlet-core-3.0.0.jar;%APP_HOME%\lib\jersey-server-3.0.0.jar;%APP_HOME%\lib\jersey-hk2-3.0.0.jar;%APP_HOME%\lib\commons-cli-1.4.jar;%APP_HOME%\lib\commons-io-2.8.0.jar;%APP_HOME%\lib\xmlpull-1.1.3.1.jar;%APP_HOME%\lib\xpp3_min-1.1.4c.jar;%APP_HOME%\lib\javax.activation-api-1.2.0.jar;%APP_HOME%\lib\jetty-jakarta-servlet-api-5.0.1.jar;%APP_HOME%\lib\jersey-client-3.0.0.jar;%APP_HOME%\lib\jersey-media-jaxb-3.0.0.jar;%APP_HOME%\lib\jersey-common-3.0.0.jar;%APP_HOME%\lib\jersey-entity-filtering-3.0.0.jar;%APP_HOME%\lib\jakarta.ws.rs-api-3.0.0.jar;%APP_HOME%\lib\jakarta.annotation-api-2.0.0.jar;%APP_HOME%\lib\hk2-locator-3.0.0-RC1.jar;%APP_HOME%\lib\hk2-api-3.0.0-RC1.jar;%APP_HOME%\lib\hk2-utils-3.0.0-RC1.jar;%APP_HOME%\lib\jakarta.inject-api-2.0.0.jar;%APP_HOME%\lib\jakarta.validation-api-3.0.0.jar;%APP_HOME%\lib\jakarta.xml.bind-api-3.0.0.jar;%APP_HOME%\lib\jackson-module-jaxb-annotations-2.11.3.jar;%APP_HOME%\lib\jackson-databind-2.11.3.jar;%APP_HOME%\lib\jackson-annotations-2.11.3.jar;%APP_HOME%\lib\javassist-3.25.0-GA.jar;%APP_HOME%\lib\jakarta.activation-2.0.0.jar;%APP_HOME%\lib\osgi-resource-locator-1.0.3.jar;%APP_HOME%\lib\jackson-core-2.11.3.jar;%APP_HOME%\lib\aopalliance-repackaged-3.0.0-RC1.jar

@rem Execute apex-ast-serializer
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% %JAVA_OPTS% %APEX_AST_SERIALIZER_OPTS%  -classpath "%CLASSPATH%" net.dangmai.serializer.Apex %CMD_LINE_ARGS%

:end
@rem End local scope for the variables with windows NT shell
if "%ERRORLEVEL%"=="0" goto mainEnd

:fail
rem Set variable APEX_AST_SERIALIZER_EXIT_CONSOLE if you need the _script_ return code instead of
rem the _cmd.exe /c_ return code!
if  not "" == "%APEX_AST_SERIALIZER_EXIT_CONSOLE%" exit 1
exit /b 1

:mainEnd
if "%OS%"=="Windows_NT" endlocal

:omega
